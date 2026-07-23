# PLAN: Fix CSP Blocking PDF Preview + PostHog Assets

> **For the execution agent:** This is a SINGLE-FILE edit. Follow every instruction exactly. Do NOT skip steps. Do NOT invent changes. Copy-paste the code blocks.

## Problem Summary

The `@react-pdf/renderer` `<PDFViewer>` component and PostHog are blocked by the Content Security Policy header defined in `next.config.ts`. Three CSP violations occur:

| # | What's blocked | CSP directive | Root cause |
|---|---------------|---------------|------------|
| 1 | `data:application/octet-stream;base64,...` (Yoga WASM) | `connect-src` | `@react-pdf/renderer` loads its Yoga layout engine WASM as an inline base64 data URI via `fetch()`. CSP only allows specific HTTPS origins, no `data:` scheme. |
| 2 | `blob:http://localhost:3000/...#toolbar=1` | `frame-src` (falls back to `default-src 'self'`) | `PDFViewer` renders the generated PDF into an `<iframe>` using a `blob:` URL. CSP has no `frame-src` directive, so `default-src 'self'` applies, blocking `blob:`. |
| 3 | `https://us-assets.i.posthog.com/static/*.js.map` | `connect-src` | PostHog SDK fetches source maps and static assets from `us-assets.i.posthog.com`. CSP `connect-src` allows `us.i.posthog.com` but NOT `us-assets.i.posthog.com`. Note: `script-src` already includes `us-assets.i.posthog.com`, but `connect-src` was missed. |

## File to Modify

| File | Change |
|------|--------|
| `next.config.ts` | Update CSP `connect-src` + add `frame-src` directive |

That's it. ONE file. TWO edits inside it.

---

## Step 1: Read the file first

Read `next.config.ts` to see the current CSP. You should see this at lines 20-28:

```typescript
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.i.posthog.com https://us-assets.i.posthog.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.deepseek.com https://api.deepinfra.com https://us.i.posthog.com https://skilled-grizzly-159157.upstash.io",
              "frame-ancestors 'none'",
            ].join('; '),
```

---

## Step 2: Update `connect-src` line

### FIND this exact string (line 26):

```typescript
              "connect-src 'self' https://api.deepseek.com https://api.deepinfra.com https://us.i.posthog.com https://skilled-grizzly-159157.upstash.io",
```

### REPLACE with:

```typescript
              "connect-src 'self' data: blob: https://api.deepseek.com https://api.deepinfra.com https://us.i.posthog.com https://us-assets.i.posthog.com https://skilled-grizzly-159157.upstash.io",
```

### What changed (3 additions):

| Addition | Why |
|----------|-----|
| `data:` | Allows Yoga WASM to load from inline base64 data URI |
| `blob:` | Allows blob URL fetches (used internally by react-pdf) |
| `https://us-assets.i.posthog.com` | Allows PostHog to fetch source maps + static assets |

---

## Step 3: Add `frame-src` directive

### FIND this exact string (line 27):

```typescript
              "frame-ancestors 'none'",
```

### REPLACE with:

```typescript
              "frame-src 'self' blob:",
              "frame-ancestors 'none'",
```

### What changed:

Added a NEW `frame-src` directive BEFORE `frame-ancestors`. This allows the `PDFViewer` to render PDFs in an iframe via `blob:` URLs.

Without this, `frame-src` falls back to `default-src 'self'` which blocks `blob:` URLs.

---

## Step 4: Verify the final file

After both edits, the CSP array in `next.config.ts` should look EXACTLY like this:

```typescript
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.i.posthog.com https://us-assets.i.posthog.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' data: blob: https://api.deepseek.com https://api.deepinfra.com https://us.i.posthog.com https://us-assets.i.posthog.com https://skilled-grizzly-159157.upstash.io",
              "frame-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join('; '),
```

**Verification checklist:**
- [ ] `connect-src` now has `data: blob:` after `'self'`
- [ ] `connect-src` now has `https://us-assets.i.posthog.com` after `https://us.i.posthog.com`
- [ ] New `frame-src 'self' blob:';` line exists BEFORE `frame-ancestors`
- [ ] `frame-ancestors 'none'` is still present and unchanged
- [ ] Array `.join('; ')` is still at the end
- [ ] No trailing comma issues, no syntax errors
- [ ] NO other lines in the file were changed

---

## Step 5: Restart dev server + verify

```bash
# Kill existing dev server, then restart
pnpm dev
```

### Manual verification:

1. Open `http://localhost:3000/en/resume/[any-resume-id]` in browser
2. Click the "View Resume" or "Preview" tab
3. Open browser DevTools Console
4. **Expected:** PDF preview renders inside iframe. Console shows ZERO CSP violations.

### Console should be CLEAN — no entries matching:
- ~~`Connecting to 'https://us-assets.i.posthog.com/static/...'~~
- ~~`Connecting to 'data:application/octet-stream;base64,...'~~
- ~~`Framing 'blob:http://localhost:3000/...'~~

If ANY of these still appear, the CSP edit was not applied correctly. Re-read `next.config.ts` and verify.

---

## Security Notes (for context, no action needed)

| Addition | Risk level | Justification |
|----------|-----------|---------------|
| `data:` in `connect-src` | Low | Only allows fetching data URIs. Script execution is still gated by `script-src`. App already allows `'unsafe-inline'` + `'unsafe-eval'` in `script-src`, so `data:` in `connect-src` doesn't lower the security posture. |
| `blob:` in `connect-src` | Low | Blob URLs are same-origin only. Cannot be used for cross-origin data exfiltration. |
| `blob:` in `frame-src` | Low | Only allows same-origin blob iframes. External sites cannot frame blob URLs from your origin. |
| `us-assets.i.posthog.com` | None | First-party PostHog CDN. Already trusted in `script-src`. |

---

## GOTCHAS

1. **Do NOT remove or change any other CSP directive.** Only `connect-src` gets modified, and `frame-src` gets added. Everything else stays identical.

2. **The `frame-src` line must come BEFORE `frame-ancestors`**, not after. While CSP directive order doesn't technically matter, keeping it before `frame-ancestors` is conventional and matches the "general to specific" ordering pattern already in use.

3. **The `data:` scheme in `connect-src` is different from `data:` in `img-src`.** The app already has `data:` in `img-src` (for inline images). This change adds it to `connect-src` (for WASM fetch). Different directives, both needed independently.

4. **Do NOT add `data:` or `blob:` to `default-src`.** That would weaken the entire policy. They go ONLY in the specific directives that need them.

5. **Restart the dev server after editing `next.config.ts`.** Next.js caches headers config. A hot reload is NOT enough — you need a full server restart for header changes to take effect.

---

## Summary

| Change | Line | Action |
|--------|------|--------|
| `connect-src` | 26 | Add `data: blob:` after `'self'`, add `https://us-assets.i.posthog.com` |
| `frame-src` | New line before `frame-ancestors` | Add `frame-src 'self' blob:` |

Total: 2 edits in 1 file. No new files. No dependency changes. No code logic changes.
