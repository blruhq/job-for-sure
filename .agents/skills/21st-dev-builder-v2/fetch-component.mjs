#!/usr/bin/env node
/**
 * 21st.dev Component Fetcher
 * 
 * Usage:
 *   node fetch-component.mjs <component-url>
 *   node fetch-component.mjs --kind component https://21st.dev/@author/components/name
 *   node fetch-component.mjs --kind usage <url>
 *   node fetch-component.mjs --kind all <url>
 *   node fetch-component.mjs --download <url>
 *
 * Kind: component | usage | all (default: all)
 */

const args = process.argv.slice(2);
let kind = "all";
let download = false;
let url = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--kind" && args[i + 1]) {
    kind = args[++i];
  } else if (args[i] === "--download") {
    download = true;
  } else if (args[i].startsWith("http")) {
    url = args[i];
  }
}

if (!url) {
  console.error("Usage: node fetch-component.mjs [--kind component|usage|all] [--download] <url>");
  console.error("  url — 21st.dev component page URL");
  process.exit(1);
}

async function main() {
  try {
    const html = await fetchHTML(url);
    const urls = extractPublicUrls(html);

    const registryUrl = urls.find((u) => u.endsWith(".json") && u.includes("/registry."));
    const componentUrl = urls.find((u) => /\/code\.[^/]+\.tsx$/.test(u));
    const usageUrl = urls.find((u) => /\/code\.demo\.[^/]+\.tsx$/.test(u));

    const files = [];

    if (registryUrl) {
      console.error(`[fetch] Registry: ${registryUrl}`);
      const registry = JSON.parse(await fetchText(registryUrl));
      for (const file of registry.files || []) {
        if (!file.path || typeof file.content !== "string") continue;
        files.push({
          kind: "component",
          name: basename(file.path),
          content: file.content,
        });
      }
    }

    if (componentUrl && !files.some((f) => f.kind === "component")) {
      console.error(`[fetch] Component: ${componentUrl}`);
      files.push({
        kind: "component",
        name: "component.tsx",
        content: await fetchText(componentUrl),
      });
    }

    if (usageUrl) {
      console.error(`[fetch] Usage: ${usageUrl}`);
      files.push({
        kind: "usage",
        name: "usage.tsx",
        content: await fetchText(usageUrl),
      });
    }

    if (!files.length) {
      console.error("No code files found on this page. URLs found:");
      for (const u of urls) console.error(`  ${u}`);
      process.exit(1);
    }

    const selected = files.filter((f) => kind === "all" || f.kind === kind);

    if (!selected.length) {
      console.error(`No ${kind} code found`);
      process.exit(1);
    }

    if (download) {
      for (const file of selected) {
        const dest = `${process.cwd()}/${file.name}`;
        require("fs").writeFileSync(dest, file.content, "utf-8");
        console.error(`[save] ${dest}`);
      }
    } else {
      for (const file of selected) {
        console.log(`\n// ${file.name}`);
        console.log(file.content.trimEnd());
        console.log();
      }
    }
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

async function fetchHTML(pageUrl) {
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; 21st-dev-fetcher/1.0)",
      Accept: "text/html,application/json,*/*",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${pageUrl}`);
  return res.text();
}

async function fetchText(fileUrl) {
  const res = await fetch(fileUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; 21st-dev-fetcher/1.0)",
      Accept: "text/html,application/json,text/plain,*/*",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${fileUrl}`);
  return res.text();
}

function extractPublicUrls(html) {
  const normalized = html
    .replaceAll("\\/", "/")
    .replaceAll("\\u002F", "/")
    .replaceAll("&amp;", "&");

  const matches = new Set();
  const re = /https:\/\/cdn\.21st\.dev\/[^"'<>\s\\]+/g;
  let m;
  while ((m = re.exec(normalized)) !== null) {
    const clean = m[0].replace(/\\+$/, "");
    if (/\/(code(\.demo)?|registry)\.[^/]+\.(tsx|json)$/.test(clean)) {
      matches.add(clean);
    }
  }
  return [...matches];
}

function basename(path) {
  return path.split("/").pop() || "component.tsx";
}

main();
