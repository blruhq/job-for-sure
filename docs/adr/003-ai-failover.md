# ADR-003: AI Provider Failover Strategy

**Status:** Accepted

**Context:** The application depends on LLM inference for resume parsing, tailoring, cover letter generation, interview mock sessions, and ATS matching. A single provider going down blocks all core features.

**Decision:** Use two OpenAI models with automatic failover. The primary model is GPT-4o (full quality), the fallback is GPT-4o-mini (reduced quality but functional). The `generateTextWithFailover()` and `generateObjectWithFailover()` wrappers in `app/lib/ai-providers.ts` handle retry logic transparently. All API route handlers and server components must use these wrappers instead of calling the AI SDK directly.

**Consequences:** Slightly higher latency on failover (primary fails → retry). The fallback model produces lower-quality responses, but the app remains functional during outages. Adding a non-OpenAI provider (Anthropic, Google) in the future requires adding a new SDK integration to the wrapper.
