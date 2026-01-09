// Immediately send extension URL to the page
console.time("[Blur DEV] Total Runtime");
console.time("[Blur DEV] Sending extension URL");
console.log("chrome.runtime is", chrome.runtime);
const extensionURL = chrome.runtime.getURL("");
window.postMessage(
  { type: "BLUR_EXTENSION_URL", url: extensionURL },
  "*"
);
console.timeEnd("[Blur DEV] Sending extension URL");

/* ----------------------------------------
 * Page feature definitions
 * -------------------------------------- */
const pageFeatures = [
  {
    url: "roblox.com/*",
    scripts: ["src/pages/all.js"]
  },
  {
    url: "roblox.com/users/friends*",
    scripts: ["src/pages/friends.js"],
    styles: ["src/pages/css/friends.css"]
  },
  {
    url: "roblox.com/home*",
    scripts: ["src/pages/home.js"],
    styles: ["src/pages/css/home.css"]
  },
  {
    url: "roblox.com/users/*/profile",
    scripts: ["src/pages/profile.js"],
    styles: ["src/pages/css/profile.css"]
  },
  {
    url: "https://www.roblox.com/my/account*",
    scripts: ["src/pages/settings.js"]
  }
];

/* ----------------------------------------
 * State tracking
 * -------------------------------------- */
const loadedScripts = new Set();
const loadedStyles = new Set();
let extensionURLAvailable = false;

/* ----------------------------------------
 * Helper: Wait for a node
 * -------------------------------------- */
function waitForNode(selector) {
  return new Promise((resolve) => {
    const node = document.querySelector(selector);
    if (node) return resolve(node);

    const obs = new MutationObserver((mutations, observer) => {
      const found = document.querySelector(selector);
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });

    obs.observe(document.documentElement, { childList: true, subtree: true });
  });
}

/* ----------------------------------------
 * Helper: Match URL
 * -------------------------------------- */
function matchUrl(pattern) {
  const regex = new RegExp(
    pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
  );
  return regex.test(location.href);
}

/* ----------------------------------------
 * Inject CSS
 * -------------------------------------- */
async function injectCSS(path) {
  if (!extensionURLAvailable || loadedStyles.has(path)) return;

  console.time(`[Blur DEV] Inject CSS ${path}`);

  const head = await waitForNode("head");

  // Fetch the CSS file
  const res = await fetch(extensionURL + path);
  const css = await res.text();

  // Inject as <style> so it always wins the cascade
  const style = document.createElement("style");
  style.setAttribute("data-blur-style", path);
  style.textContent = css;

  head.appendChild(style);
  loadedStyles.add(path);

  console.timeEnd(`[Blur DEV] Inject CSS ${path}`);
}

/* ----------------------------------------
 * Load JS module
 * -------------------------------------- */
async function loadScript(path) {
  if (!extensionURLAvailable || loadedScripts.has(path)) return;

  console.time(`[Blur DEV] Load JS ${path}`);
  try {
    await import(extensionURL + path);
    loadedScripts.add(path);
    console.timeEnd(`[Blur DEV] Load JS ${path}`);
    console.log(`[Blur DEV] Loaded JS: ${path}`);
  } catch (err) {
    console.error(`[Blur DEV] Error loading JS: ${path}`, err);
  }
}

/* ----------------------------------------
 * Load features (CSS + JS in parallel)
 * -------------------------------------- */
async function loadFeatures() {
  if (!extensionURLAvailable) return;
  console.time("[Blur DEV] Load Features");

  for (const page of pageFeatures) {
    if (!matchUrl(page.url)) continue;

    // Load CSS first (because it needs <head>)
    const cssPromises = page.styles?.map(style => injectCSS(style)) || [];
    await Promise.all(cssPromises);

    // Load JS in parallel
    const jsPromises = (page.scripts || []).map(async script => {
      await loadScript(script);

      // Optional: run exposed page functions
      const runnerName =
        script.includes("home")
          ? "blurHomeRun"
          : script.includes("friends")
          ? "blurFriendsRun"
          : null;

      if (runnerName && typeof window[runnerName] === "function") {
        console.time(`[Blur DEV] Run ${runnerName}`);
        window[runnerName]();
        console.timeEnd(`[Blur DEV] Run ${runnerName}`);
      }
    });
    await Promise.all(jsPromises);
  }

  console.timeEnd("[Blur DEV] Load Features");
}

/* ----------------------------------------
 * SPA navigation hook
 * -------------------------------------- */
function hookHistory(onChange) {
  const push = history.pushState;
  const replace = history.replaceState;

  history.pushState = function (...args) {
    push.apply(this, args);
    onChange();
  };

  history.replaceState = function (...args) {
    replace.apply(this, args);
    onChange();
  };

  window.addEventListener("popstate", onChange);
}

/* ----------------------------------------
 * Listen for extension URL from isolated script
 * -------------------------------------- */
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type === "BLUR_EXTENSION_URL") {
    console.time("[Blur DEV] Extension URL Received");
    extensionURLAvailable = true;
    window.extensionURL = event.data.url;
    console.log("[Blur DEV] Received extension URL:", event.data.url);

    // Initial feature load
    loadFeatures().then(() => console.timeEnd("[Blur DEV] Extension URL Received"));

    // Hook SPA navigation
    hookHistory(() => loadFeatures());
  }
});

// End total runtime timer on window load
window.addEventListener("load", () => {
  console.timeEnd("[Blur DEV] Total Runtime");
});