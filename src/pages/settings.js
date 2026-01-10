// ==UserScript==
// @name         Roblox Settings Blur Extension
// @match        https://www.roblox.com/my/account*
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const EXT_PARAM = "extension";
  const EXT_VALUE = "blur";

  /* -----------------------------
     Utils
  ----------------------------- */

  function waitFor(sel) {
    return new Promise(r => {
      const el = document.querySelector(sel);
      if (el) return r(el);
      const o = new MutationObserver(() => {
        const e = document.querySelector(sel);
        if (e) {
          o.disconnect();
          r(e);
        }
      });
      o.observe(document, { childList: true, subtree: true });
    });
  }

  function getQuery() {
    return new URLSearchParams(location.search);
  }

  function setQuery(param, value) {
    const q = getQuery();
    if (value === null) q.delete(param);
    else q.set(param, value);
    history.replaceState({}, "", location.pathname + "?" + q.toString() + location.hash);
  }

  /* -----------------------------
     Extension Root
  ----------------------------- */

  let extRoot;

  function createRoot() {
    if (extRoot) return;

    const content = document.querySelector(".content");

    extRoot = document.createElement("div");
    extRoot.id = "blur-root";
    extRoot.style.display = "none";
    extRoot.style.height = "100%";

    content.appendChild(extRoot);
  }

  function showExtension() {
    createRoot();
    extRoot.style.display = "block";

    document.querySelectorAll(".content > *:not(#blur-root)")
      .forEach(el => el.style.display = "none");
  }

  function hideExtension() {
    if (!extRoot) return;
    extRoot.style.display = "none";

    document.querySelectorAll(".content > *:not(#blur-root)")
      .forEach(el => el.style.display = "");
  }

  /* -----------------------------
     Render UI
  ----------------------------- */

  function render(tab = "general") {
    showExtension();

    extRoot.innerHTML = `
      <style>
        .blur-wrap {
          padding: 24px;
          color: var(--text-primary);
          font-family: var(--font-family-base);
        }
        .blur-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        .blur-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .blur-tab {
          padding: 8px 14px;
          border-radius: 8px;
          background: var(--surface-200);
          cursor: pointer;
        }
        .blur-tab.active {
          background: var(--brand-600);
          color: white;
        }
        .blur-card {
          background: var(--surface-100);
          border-radius: 12px;
          padding: 16px;
          box-shadow: var(--shadow-medium);
        }
        .row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid var(--surface-300);
        }
      </style>

      <div class="blur-wrap">
        <div class="blur-title">Blur Settings</div>

        <div class="blur-tabs">
          <div class="blur-tab" data-tab="general">General</div>
          <div class="blur-tab" data-tab="features">Features</div>
          <div class="blur-tab" data-tab="advanced">Advanced</div>
        </div>

        <div class="blur-card" id="panel"></div>
      </div>
    `;

    const panel = extRoot.querySelector("#panel");

    const draw = t => {
      panel.innerHTML =
        t === "features"
          ? `<div class="row"><span>Better Avatars</span><input type="checkbox"></div>`
          : t === "advanced"
          ? `<div class="row"><span>Debug Mode</span><input type="checkbox"></div>`
          : `<div class="row"><span>Enable Blur</span><input type="checkbox" checked></div>`;

      extRoot.querySelectorAll(".blur-tab")
        .forEach(e => e.classList.toggle("active", e.dataset.tab === t));
    };

    extRoot.querySelectorAll(".blur-tab").forEach(t => {
      t.onclick = () => {
        setQuery(EXT_PARAM, EXT_VALUE + "/" + t.dataset.tab);
        draw(t.dataset.tab);
      };
    });

    draw(tab);
  }

  /* -----------------------------
     Sidebar Integration
  ----------------------------- */

  async function injectSidebar() {
    const list = await waitFor("ul.menu-vertical");
    if (list.querySelector("#blur")) return;

    const base = list.querySelector("li.menu-option");
    const clone = base.cloneNode(true);

    clone.id = "blur";
    clone.querySelector(".font-caption-header").textContent = "Blur";
    clone.querySelector(".rbx-tab-subtitle").textContent = "";

    const a = clone.querySelector("a");
    a.href = "?extension=" + EXT_VALUE;

    a.onclick = e => {
      e.preventDefault();
      setQuery(EXT_PARAM, EXT_VALUE + "/general");
      render("general");

      list.querySelectorAll(".menu-option-content")
        .forEach(a => a.classList.remove("active"));

      clone.querySelector(".menu-option-content").classList.add("active");
    };

    list.appendChild(clone);
  }

  /* -----------------------------
     Router
  ----------------------------- */

  function route() {
    const q = getQuery();
    const extTab = q.get(EXT_PARAM);

    if (extTab && extTab.startsWith(EXT_VALUE)) {
      const tab = extTab.split("/")[1];
      render(tab || "general");

      document.querySelectorAll(".menu-option-content")
        .forEach(a => a.classList.remove("active"));
      document.querySelector("#blur .menu-option-content")?.classList.add("active");
    } else {
      hideExtension();
    }
  }

  /* -----------------------------
     Init
  ----------------------------- */

  injectSidebar();
  route();
  window.addEventListener("popstate", route);
})();