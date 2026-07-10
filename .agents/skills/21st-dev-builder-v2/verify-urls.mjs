// Verify URL patterns against live 21st.dev
const urls = [
  // Category browse
  { label: "Category: hero", url: "https://21st.dev/community/components/s/hero" },
  { label: "Category: buttons", url: "https://21st.dev/community/components/s/buttons" },
  // Component details  
  { label: "Component: background-paths", url: "https://21st.dev/@kokonutd/components/background-paths" },
  { label: "Component: sparkles", url: "https://21st.dev/@aceternity/components/sparkles" },
  { label: "Component: marquee", url: "https://21st.dev/@magicui/components/marquee" },
  // Author profile
  { label: "Author: serafim", url: "https://21st.dev/@serafim" },
  // Library
  { label: "Library: aceternity", url: "https://21st.dev/@aceternity/library/default" },
  // Themes
  { label: "Themes", url: "https://21st.dev/community/themes" },
  // Install URL
  { label: "Install (r/ pattern)", url: "https://21st.dev/r/kokonutd/background-paths" },
];

for (const { label, url } of urls) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html,*/*" },
      redirect: "manual",
    });
    const status = res.status;
    const location = res.headers.get("location") || "";
    const finalUrl = res.headers.get("x-middleware-rewrite") || "";
    console.log(`${status}${location ? " -> " + location : ""}  ${label.padEnd(35)} ${url}`);
  } catch (err) {
    console.log(`ERR  ${label.padEnd(35)} ${url} — ${err.message}`);
  }
}
