import { streamText, convertToModelMessages, type LanguageModel } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

// ═══════════════════════════════════════════════════════════════
// PROVIDER INSTANCES
// Each provider is an OpenAI-compatible endpoint running
// DeepSeek V4 Flash at different price/reliability tiers.
// ═══════════════════════════════════════════════════════════════

// Layer 1: DeepSeek Official — cheapest (98% cache discount on prefix hits)
const deepseekOfficial = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

// Layer 2: DeepInfra — fast bare-metal inference, low base rates
const deepinfraBackup = createOpenAI({
  baseURL: 'https://api.deepinfra.com/v1/openai',
  apiKey: process.env.DEEPINFRA_API_KEY,
})

// ═══════════════════════════════════════════════════════════════
// PROVIDER CHAIN
// Order matters: first provider is primary, rest are fallbacks.
// ═══════════════════════════════════════════════════════════════

interface ProviderConfig {
  model: LanguageModel
  name: string
  timeout: number // ms to wait for first chunk before giving up
}

const MODEL_ID = 'deepseek-v4-flash'

export const providers: ProviderConfig[] = [
  {
    model: deepseekOfficial.chat(MODEL_ID),
    name: 'DeepSeek Official',
    timeout: 6_000,
  },
  {
    model: deepinfraBackup.chat('deepseek-ai/DeepSeek-V4-Flash'),
    name: 'DeepInfra',
    timeout: 8_000,
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
      const firstChunk = await Promise.race([
        reader.read(),
        timeoutPromise(provider.timeout, provider.name),
      ])

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
// GENERATE WITH FAILOVER
//
// Non-streaming version for routes that just need text output
// (ATS match, tailor). Uses generateText instead of streamText.
// ═══════════════════════════════════════════════════════════════

import { generateText } from 'ai'

interface GenerateParams {
  system: string
  prompt: string
  temperature?: number
  maxOutputTokens?: number
}

export async function generateWithFailover(
  params: GenerateParams,
): Promise<string> {
  const { system, prompt, temperature = 0.7, maxOutputTokens = 1024 } = params

  let lastError: Error | null = null

  for (const provider of providers) {
    try {
      const result = await Promise.race([
        generateText({
          model: provider.model,
          system,
          prompt,
          temperature,
          maxOutputTokens,
        }),
        timeoutPromise(provider.timeout, provider.name),
      ])

      return result.text
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`⚠️  [AI] ${provider.name} failed: ${msg}`)
      lastError = err instanceof Error ? err : new Error(msg)
      continue
    }
  }

  throw lastError || new Error('All AI providers failed')
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function timeoutPromise(ms: number, providerName: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`${providerName}: timed out after ${ms}ms`)),
      ms,
    ),
  )
}
