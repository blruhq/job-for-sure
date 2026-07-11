# ADR-002: Use @react-pdf/renderer for PDF Generation

**Status:** Accepted

**Context:** We need to generate resume PDFs server-side for download. Common approaches include Puppeteer/Playwright (headless browser renders HTML → PDF), print CSS (`@media print`), and `@react-pdf/renderer`.

**Decision:** Use `@react-pdf/renderer`. Unlike Puppeteer, it does not require a headless Chromium binary (saves ~300MB+ in serverless deployment). It supports embedded fonts, deterministic output, and runs in Edge/Node.js runtimes. The component model (`Document` → `Page` → `View` → `Text`) maps naturally to our React component patterns.

**Consequences:** We cannot use standard HTML/CSS for PDF layouts — all PDF styling uses `@react-pdf`'s StyleSheet API. Complex layouts (tables, multi-column) require more code than HTML-to-PDF approaches. PDF preview in the browser requires rendering separately (we use a separate HTML preview for the "View" tab).
