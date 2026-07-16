import { streamText, convertToModelMessages, generateText, generateObject, type LanguageModel } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { z } from 'zod'

// ═══════════════════════════════════════════════════════════════
// PROVIDER INSTANCES
// Each provider is an OpenAI-compatible endpoint running
// DeepSeek V4 Flash at different price/reliability tiers.
// ═══════════════════════════════════════════════════════════════

// Layer 0: thinking-disabled via fetch wrapper
// deepseek-v4-flash defaults to thinking ENABLED (high effort). It emits
// chain-of-thought BEFORE the answer — pure waste for structured JSON:
// slower, costlier, and temperature/top_p become silent no-ops.
function createNoThinkingProvider(opts: { baseURL: string; apiKey?: string }) {
  return createOpenAI({
    baseURL: opts.baseURL,
    apiKey: opts.apiKey,
    fetch: async (input, init) => {
      if (init?.body && typeof init.body === 'string') {
        try {
          const body = JSON.parse(init.body)
          body.thinking = { type: 'disabled' }
          // DeepSeek doesn't support response_format: json_schema.
          // Replace with json_object so the model still knows to emit JSON,
          // and rely on the system prompt to guide the schema shape.
          if (body.response_format?.type === 'json_schema') {
            body.response_format = { type: 'json_object' }
          }
          init = { ...init, body: JSON.stringify(body) }
        } catch {
          // non-JSON body — leave untouched
        }
      }
      return globalThis.fetch(input as RequestInfo, init as RequestInit)
    },
  })
}

const deepseekOfficial = createNoThinkingProvider({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

const deepinfraBackup = createNoThinkingProvider({
  baseURL: 'https://api.deepinfra.com/v1/openai',
  apiKey: process.env.DEEPINFRA_API_KEY,
})

interface ProviderConfig {
  model: LanguageModel
  name: string
  timeout: number // ms to wait for response before giving up
}

const MODEL_ID = 'deepseek-v4-flash'

export const providers: ProviderConfig[] = [
  {
    model: deepseekOfficial.chat(MODEL_ID),
    name: 'DeepSeek Official',
    // DeepInfra fallback can be slower than the primary; keep enough headroom
    // under the route's maxDuration while still giving slow providers a chance.
    timeout: 55_000,
  },
  {
    model: deepinfraBackup.chat('deepseek-ai/DeepSeek-V4-Flash'),
    name: 'DeepInfra',
    timeout: 55_000,
  },
]

// ═══════════════════════════════════════════════════════════════
// STREAM WITH FAILOVER
//
// Tries each provider in order. Peeks at the first chunk of each
// stream to verify the provider is responding. If the first chunk
// is an error, or doesn't arrive within the timeout, falls through
// to the next provider. Once a provider emits a valid first chunk,
// the full stream (including that chunk) is returned as a Response.
//
// This handles:
//   - Connection refused / DNS errors (provider is down)
//   - 401 / 403 (invalid API key)
//   - 429 (rate limited)
//   - 500 / 502 / 503 (server errors)
//   - Timeouts (server hangs, accepts but doesn't respond)
//
// It does NOT handle mid-stream failures (provider starts responding
// then drops). Those will surface as stream errors to the client.
// ═══════════════════════════════════════════════════════════════

interface StreamParams {
  system: string
  messages: unknown[] // UIMessage[] from the client
  temperature?: number
  maxOutputTokens?: number
}

export async function streamWithFailover(
  params: StreamParams,
): Promise<Response> {
  const { system, messages, temperature = 0.7, maxOutputTokens = 1024 } = params
  const modelMessages = await convertToModelMessages(messages as any)

  let lastError: Error | null = null

  for (const provider of providers) {
    try {
      const result = streamText({
        model: provider.model,
        system,
        messages: modelMessages,
        temperature,
        maxOutputTokens,
      })

      // Get the SSE-formatted Response (byte stream, not object stream)
      const response = result.toUIMessageStreamResponse()
      const body = response.body!

      // Peek at the first chunk to verify the provider is responding
      const reader = body.getReader()
      let timer: ReturnType<typeof setTimeout> | undefined
      const firstChunk = await Promise.race([
        reader.read(),
        new Promise<{ done: true; value: undefined }>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`${provider.name}: timed out after ${provider.timeout}ms`)),
            provider.timeout,
          )
        }),
      ])

      // Clear the timeout — the race is over, don't leak the timer
      if (timer) clearTimeout(timer)

      if (firstChunk.done) {
        throw new Error(`${provider.name}: stream ended before any data`)
      }

      // Decode the first chunk to check for errors
      const firstText = new TextDecoder().decode(firstChunk.value)
      if (firstText.includes('"type":"error"') || response.status >= 400) {
        throw new Error(`${provider.name}: stream error — ${firstText.slice(0, 200)}`)
      }

      // ── SUCCESS ──
      // Provider is responding. Create a byte stream that replays
      // the first chunk, then pipes the rest through.
      const combinedStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          // Replay the first bytes we already consumed
          controller.enqueue(firstChunk.value)

          // Pipe the remaining bytes
          try {
            while (true) {
              const { value, done } = await reader.read()
              if (done) break
              controller.enqueue(value)
            }
            controller.close()
          } catch (err) {
            controller.error(err)
          } finally {
            reader.releaseLock()
          }
        },
        cancel() {
          reader.cancel()
        },
      })

      return new Response(combinedStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-AI-Provider': provider.name,
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`⚠️  [AI] ${provider.name} failed: ${msg}`)
      lastError = err instanceof Error ? err : new Error(msg)
      continue
    }
  }

  // All providers failed
  return new Response(
    JSON.stringify({
      error: 'All AI providers are currently unavailable. Please try again.',
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

// ═══════════════════════════════════════════════════════════════
// GENERATE TEXT WITH FAILOVER (kept for cover-letter — plain text)
// Now with AbortController
// ═══════════════════════════════════════════════════════════════

interface GenerateParams {
  system: string
  prompt: string
  temperature?: number
  maxOutputTokens?: number
}

export async function generateTextWithFailover(
  params: GenerateParams,
): Promise<string> {
  const { system, prompt, temperature = 0.7, maxOutputTokens = 1024 } = params

  let lastError: Error | null = null

  for (const provider of providers) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), provider.timeout)
    try {
      const result = await generateText({
        model: provider.model,
        system,
        prompt,
        temperature,
        maxOutputTokens,
        abortSignal: controller.signal,
      })

      return result.text
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`⚠️  [AI] ${provider.name} failed: ${msg}`)
      lastError = err instanceof Error ? err : new Error(msg)
      continue
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError || new Error('All AI providers failed')
}

// ═══════════════════════════════════════════════════════════════
// GENERATE OBJECT WITH FAILOVER
// Uses the Vercel AI SDK's native generateObject with Zod schema.
// The noThinkingProvider wrapper converts json_schema → json_object
// for DeepSeek compatibility, and we use 'json' output format.
// ═══════════════════════════════════════════════════════════════

interface GenerateObjectParams {
  system: string
  prompt: string
  schema: z.ZodTypeAny
  temperature?: number
  maxOutputTokens?: number
}

export async function generateObjectWithFailover<T>(
  params: GenerateObjectParams,
): Promise<T> {
  const { system, prompt, schema, temperature = 0, maxOutputTokens = 2048 } = params

  let lastError: Error | null = null

  for (const provider of providers) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), provider.timeout)
    try {
      const result = await generateObject({
        model: provider.model,
        system,
        prompt,
        schema,
        temperature,
        maxOutputTokens,
        abortSignal: controller.signal,
        output: 'object',
      })

      return result.object as T
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`⚠️  [AI] ${provider.name} failed: ${msg}`)
      lastError = err instanceof Error ? err : new Error(msg)
      continue
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError || new Error('All AI providers failed')
}
