// Look at the agent templates page for the full list
async function fetchRSC(url) {
  const res = await fetch(url + "?_rsc=3hd5j", {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/x-component",
    },
  });
  return res.text();
}

// Get the listing page for agent templates
const rsc = await fetchRSC("https://21st.dev/community/templates");
console.log("RSC data:");
console.log(rsc);
