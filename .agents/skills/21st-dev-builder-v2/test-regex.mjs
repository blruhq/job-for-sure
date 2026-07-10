const html = await (await fetch("https://21st.dev/@kokonutd/components/background-paths", {
  headers: { "User-Agent": "Mozilla/5.0" }
})).text();

const normalized = html
  .replaceAll('\\/', '/')
  .replaceAll('\\u002F', '/')
  .replaceAll("&amp;", "&");

const urls = new Set();
const re = /https:\/\/cdn\.21st\.dev\/[^"'<>\s\\]+/g;
let m;
while ((m = re.exec(normalized)) !== null) {
  const clean = m[0].replace(/\\+$/, "");
  if (/\/(code(\.demo)?|registry)\.[^/]+\.(tsx|json)$/.test(clean)) {
    urls.add(clean);
    console.log("MATCH:", clean);
  }
}

console.log("Total:", urls.size);
