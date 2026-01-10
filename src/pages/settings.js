import { Storage } from "../helpers/storage.js";
import { blurSettingsOptions } from "../constaints/settings.js";

const storage = new Storage();
await storage.initDefaults();

(async () => {
  "use strict";

  const EXT_KEY = "extension";
  const EXT_VAL = "blur";

  let blurRoot = null;
  let blurNav = null;

  /* -----------------------------
     Utils
  ----------------------------- */
  function waitFor(sel) {
    return new Promise(resolve => {
      const el = document.querySelector(sel);
      if (el) return resolve(el);
      const obs = new MutationObserver(() => {
        const found = document.querySelector(sel);
        if (found) {
          obs.disconnect();
          resolve(found);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });
  }

  function getQuery() {
    return new URLSearchParams(location.search);
  }

  function setQuery(tab) {
    const q = getQuery();
    if (!tab) q.delete(EXT_KEY);
    else q.set(EXT_KEY, `${EXT_VAL}/${tab}`);
    history.replaceState({}, "", location.pathname + "?" + q + location.hash);
  }

  function getTab() {
    const v = getQuery().get(EXT_KEY);
    if (!v || !v.startsWith(EXT_VAL)) return null;
    return v.split("/")[1] || "general";
  }

  /* -----------------------------
     Root handling
  ----------------------------- */
  function createRoot() {
    if (blurRoot) return;
    const content = document.querySelector(".content");
    if (!content) return;
    blurRoot = document.createElement("div");
    blurRoot.id = "blur-settings-container";
    blurRoot.style.display = "none";
    content.appendChild(blurRoot);
  }

  function showBlur() {
    createRoot();
    blurRoot.style.display = "";
    document.querySelectorAll(".content > *:not(#blur-settings-container)").forEach(el => (el.style.display = "none"));
  }

  function hideBlur() {
    if (!blurRoot) return;
    blurRoot.style.display = "none";
    document.querySelectorAll(".content > *:not(#blur-settings-container)").forEach(el => (el.style.display = ""));
  }

  /* -----------------------------
     UI
  ----------------------------- */
  function render(tab = "general") {
    showBlur();

    blurRoot.innerHTML = `
<div class="row page-content">
  <div class="blur-settings">

    <button type="button"
      class="btn-secondary-md btn-min-width"
      id="blur-exit">
      Return to Roblox Settings
    </button>

    <h1 class="container-title">Blur Settings</h1>

    <div id="settings-container">
      <div class="settings-left-navigation">
        <ul class="menu-vertical transparent-background-menu" role="tablist">
          ${Object.keys(blurSettingsOptions).map(t => renderTab(t, tab)).join("")}
        </ul>
      </div>

      <div class="tab-content rbx-tab-content">
        <div class="tab-pane active">
          <div class="section">
            <div class="container-header hidden-xs">
              <h3>${capitalize(tab)}</h3>
            </div>
            <div class="section-content">
              ${renderPanel(tab)}
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>
`;

    // Exit button
    blurRoot.querySelector("#blur-exit").onclick = () => {
      setQuery(null);
      route();
    };

    // Tab buttons
    blurRoot.querySelectorAll("[data-tab]").forEach(el => {
      el.onclick = () => {
        setQuery(el.dataset.tab);
        route();
      };
    });

    // Attach toggle and input handlers
    blurRoot.querySelectorAll("[data-storage-key]").forEach(el => {
      const key = el.dataset.storageKey;
      if (!key) return;

      if (el.tagName.toLowerCase() === "button") {
        // Toggle button
        (async () => {
          const value = await storage.get(key, false);
          console.log(`Initial value for ${key}:`, value);
          el.classList.toggle("on", value);
          el.classList.toggle("off", !value);
        })();

        el.addEventListener("click", async () => {
          const newState = !(await storage.get(key, false));
          await storage.set(key, newState);
          console.log(`Updated value for ${key}:`, newState);
          el.classList.toggle("on", newState);
          el.classList.toggle("off", !newState);
        });

      } else if (el.tagName.toLowerCase() === "input") {
        // Text input
        (async () => {
          const value = await storage.get(key, "");
          console.log(`Initial value for ${key}:`, value);
          el.value = value;
        })();

        el.addEventListener("input", async () => {
          await storage.set(key, el.value);
          console.log(`Updated value for ${key}:`, el.value);
        });
      }
    });
  }

  function renderTab(name, activeTab) {
    return `
<li role="tab" class="menu-option">
  <a class="menu-option-content ${name === activeTab ? "active" : ""}" data-tab="${name}">
    <span class="font-caption-header">${capitalize(name)}</span>
  </a>
</li>`;
  }

  function renderPanel(tab) {
    const options = blurSettingsOptions[tab] || [];
    return options.map(opt => {
      if (opt.type === "toggle") return renderToggle(opt.name, opt.details, opt.storageKey);
      if (opt.type === "string") return renderStringInput(opt.name, opt.details, opt.storageKey);
      if (opt.type === "subLabel") return renderSubLabel(opt.name);
      return "";
    }).join("");
  }

  function renderToggle(label, details, storageKey) {
    // Replace "/n" in your string with HTML line breaks
    const formattedDetails = details ? details.replace(/\/n/g, "<br>") : "";
    return `
      <div class="feature-container section-content">
        <div class="feature-name-container">
          <div class="feature-text">
            <div class="btn-toggle-label">${label}</div>
            ${formattedDetails ? `<div class="feature-details">${formattedDetails}</div>` : ""}
          </div>
          <button type="button" class="btn-toggle feature-component off" data-storage-key="${storageKey}">
            <span class="toggle-flip"></span>
            <span class="toggle-on"></span>
            <span class="toggle-off"></span>
          </button>
        </div>
      </div>
    `;
  }

  function renderStringInput(label, details, storageKey) {
    const formattedDetails = details ? details.replace(/\/n/g, "<br>") : "";
    return `
      <div class="feature-container section-content">
        <div class="feature-name-container">
          <div class="feature-text" style="flex: 1;">
            <div class="btn-toggle-label">${label}</div>
            ${formattedDetails ? `<div class="feature-details">${formattedDetails}</div>` : ""}
            <input type="text" data-storage-key="${storageKey}" class="form-control" />
          </div>
        </div>
      </div>
    `;
  }

  function renderSubLabel(label) {
    return `<div class="feature-container section-content"><div class="feature-name-container"><div class="btn-toggle-label">${label}</div></div></div>`;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* -----------------------------
     Sidebar injection
  ----------------------------- */
  async function injectSidebar() {
    const list = await waitFor(
      "#settings-container > div.settings-left-navigation > ul"
    );

    if (list.querySelector("#blur-nav")) {
      blurNav = list.querySelector("#blur-nav");
      return;
    }

    const base = list.querySelector("li.menu-option");
    const clone = base.cloneNode(true);

    clone.id = "blur-nav";
    clone.querySelector(".font-caption-header").textContent = "Blur";
    clone.querySelector(".rbx-tab-subtitle")?.remove();

    const a = clone.querySelector("a");
    a.href = "?extension=blur/general";

    a.onclick = e => {
      e.preventDefault();
      setQuery("general");
      route();
    };

    // Never inject active class on the Roblox page button
    a.classList.remove("active");
    a.removeAttribute("aria-current");

    list.appendChild(clone);
    blurNav = clone;
  }

  /* -----------------------------
     Router
  ----------------------------- */
  function route() {
    const tab = getTab();
    if (tab) {
      render(tab);
    } else {
      hideBlur();
    }
  }

  /* -----------------------------
     Init
  ----------------------------- */
  await injectSidebar();
  route();
  window.addEventListener("popstate", route);

})();