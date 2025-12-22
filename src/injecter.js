const DEV = true;

// Map page strings to scripts
let pageFeatures;
async function loadPageFeatures() {
  const url = chrome.runtime.getURL('src/constaints/injecter.js');
  const response = await fetch(url);
  pageFeatures = await response.json();
}

loadPageFeatures();

const loadedScripts = new Set();

async function loadFeatures() {
  for (const page of pageFeatures) {
    const pages = page.page.split(",").map(p => p.trim());
    if (pages.includes("*") || pages.some(p => location.href.includes(p))) {
      for (const path of page.scripts) {
        if (loadedScripts.has(path)) continue; // avoid duplicate imports

        try {
          await import(chrome.runtime.getURL(path));
          loadedScripts.add(path);
          console.log(`[Blur DEV] Loaded ${path} for ${location.href}`);
        } catch (err) {
          console.error(`[Blur DEV] Error loading ${path}`, err);
        }
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
