# ADR-003: AI Provider Failover Strategy

**Status:** Updated (2025-07-13)

**Context:** The application depends on LLM inference for resume parsing, tailoring, cover letter generation, interview mock sessions, and ATS matching. A single provider going down blocks all core features.

**Decision:** Use two OpenAI-compatible endpoints with automatic failover. Both providers serve **DeepSeek V4 Flash** at different reliability tiers:

1. **Primary**: DeepSeek Official (`api.deepseek.com`) — cheapest with cache discount
2. **Fallback**: DeepInfra (`api.deepinfra.com`) — fast bare-metal inference backup

The `generateTextWithFailover()`, `generateObjectWithFailover()`, and `streamWithFailover()` wrappers in `src/app/lib/ai-providers.ts` handle retry logic transparently. All API route handlers and server components must use these wrappers instead of calling the AI SDK directly.

**DeepSeek-Specific Adaptations:**
- The `createNoThinkingProvider()` wrapper disables DeepSeek's chain-of-thought (`thinking: { type: 'disabled' }`) for structured JSON responses — this prevents wasted tokens and makes temperature/top_p work correctly.
- DeepSeek doesn't support `response_format: json_schema`. The wrapper converts `json_schema` → `json_object` and relies on the system prompt to guide the schema shape.

**Consequences:** Slightly higher latency on failover (primary fails → retry). The fallback provider produces comparable quality (same model, different hosting). If DeepSeek model quality degrades, adding a non-DeepSeek provider (OpenAI GPT-4o, Anthropic Claude) requires adding a new SDK integration to the wrapper.

**Previous Version:** This ADR originally specified GPT-4o (primary) and GPT-4o-mini (fallback) via OpenAI. The project migrated to DeepSeek V4 Flash for cost efficiency.
