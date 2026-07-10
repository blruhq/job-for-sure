// Verify category slugs against live 21st.dev
const categories = [
  "call-to-action", "hero", "navbar-navigation", "modal-dialog",
  "registration-signup", "sign-in", "chip-tag", "upload-download",
  "announcement", "background", "comparison", "dock", "footer",
  "icons", "number", "spinner-loader", "border", "hook", "map", "video",
];

for (const slug of categories) {
  try {
    const res = await fetch(`https://21st.dev/community/components/s/${slug}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const status = res.status;
    const text = await res.text();
    // Check page title or content to see if it's a valid category
    const hasContent = text.includes("components") || text.includes(slug);
    const componentCount = (text.match(/component-\w+/g) || []).length;
    console.log(`${status}  count=${componentCount}  slug=${slug}`);
  } catch (err) {
    console.log(`ERR  slug=${slug} — ${err.message}`);
  }
}
