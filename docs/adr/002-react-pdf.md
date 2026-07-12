# ADR-002: Use @react-pdf/renderer for PDF Generation and Preview

**Status:** Updated

**Context:** We need to generate resume PDFs server-side for download AND show a real-time preview in the browser. Common approaches include Puppeteer/Playwright (headless browser), print CSS, and `@react-pdf/renderer`.

**Decision:** Use `@react-pdf/renderer` for BOTH server-side PDF export AND client-side preview. The preview uses `@react-pdf/renderer`'s `<PDFViewer>` component, which renders the actual PDF in the browser via an iframe. This ensures the preview is always a 100% match to the exported PDF (true WYSIWYG).

We previously maintained separate HTML/CSS preview components alongside the PDF components. This caused preview-to-PDF mismatches, required double the maintenance (5 templates × 2 renderers = 10 files), and made it impossible to guarantee WYSIWYG. We now use a single set of PDF components for both preview and export (5 files).

**Consequences:**
- Preview renders inside an iframe with a ~200-500ms initial load time (acceptable).
- The iframe includes a built-in toolbar (zoom, page navigation, download, print).
- Fonts are loaded via `Font.register()` in `shared-pdf.ts` using environment-aware paths (URL for browser, filesystem for server).
- Dark mode does not affect the PDF preview (paper is always white — this is correct).
- `next/dynamic` with `ssr: false` is used to prevent server-side rendering of `PDFViewer`.
- This is the same approach used by Reactive Resume (39.5k stars) and OpenResume (8.7k stars).
