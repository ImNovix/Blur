const pageFeatures = [
  {
    url: "roblox.com/users/friends*",
    scripts: ["src/pages/friends.js"]
  },
  {
    url: "roblox.com/home*",
    scripts: ["src/pages/home.js"]
  }
];

const loadedScripts = new Set();

function matchUrl(pattern) {
  const regex = new RegExp(
    pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
  );

  return regex.test(location.href);
}

async function loadFeatures() {
  for (const page of pageFeatures) {
    if (!matchUrl(page.url)) continue;

    for (const path of page.scripts) {
      if (loadedScripts.has(path)) continue;

      try {
        await import(chrome.runtime.getURL(path));
        loadedScripts.add(path);
        console.log(`[Blur DEV] Loaded ${path}`);
      } catch (err) {
        console.error(`[Blur DEV] Error loading ${path}`, err);
      }
    }
  }
}

// Run once
loadFeatures();

// Re-run on SPA page changes
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    loadFeatures();
  }
}).observe(document, { subtree: true, childList: true });
