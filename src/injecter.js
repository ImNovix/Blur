const pageFeatures = [
  {
    url: "roblox.com/users/friends*",
    scripts: ["src/pages/friends.js"],
    styles: ["src/pages/css/friends.css"]
  },
  {
    url: "roblox.com/home*",
    scripts: ["src/pages/home.js"]
  }
];

const loadedScripts = new Set();
const loadedStyles = new Set();

/* ----------------------------------------
 * URL matching
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
 * CSS injection
 * -------------------------------------- */
function injectCSS(path) {
  if (loadedStyles.has(path)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL(path);

  document.head.appendChild(link);
  loadedStyles.add(path);

  console.log(`[Blur DEV] Injected CSS ${path}`);
}

/* ----------------------------------------
 * Feature loader
 * -------------------------------------- */
async function loadFeatures() {
  for (const page of pageFeatures) {
    if (!matchUrl(page.url)) continue;

    // CSS
    if (page.styles) {
      for (const style of page.styles) {
        injectCSS(style);
      }
    }

    // JS
    if (page.scripts) {
      for (const script of page.scripts) {
        // import ONCE
        if (!loadedScripts.has(script)) {
          try {
            await import(chrome.runtime.getURL(script));
            loadedScripts.add(script);
            console.log(`[Blur DEV] Loaded ${script}`);
          } catch (err) {
            console.error(`[Blur DEV] Error loading ${script}`, err);
            continue;
          }
        }

        // re-run page logic if exposed
        const runnerName =
          script.includes("home")
            ? "blurHomeRun"
            : script.includes("friends")
            ? "blurFriendsRun"
            : null;

        if (runnerName && typeof window[runnerName] === "function") {
          window[runnerName]();
        }
      }
    }
  }
}

/* ----------------------------------------
 * SPA navigation hook (REQUIRED for Roblox)
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
 * Init
 * -------------------------------------- */
let lastUrl = location.href;

// initial run
loadFeatures();

// SPA navigation
hookHistory(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    loadFeatures();
  }
});