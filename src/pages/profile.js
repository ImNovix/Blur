import { fetchRoblox } from "../helpers/robloxAPI.js";
import { waitForSelector } from "../helpers/elements.js";
import { Storage } from "../helpers/storage.js";

const storage = new Storage();
await storage.initDefaults();

const userID = getProfileUserIdFromUrl();
const authID = (await fetchRoblox.getAuth()).id;

function getProfileUserIdFromUrl() {
    const m = window.location.pathname.match(/\/users\/(\d+)(?:\/|$)/i);
    if (m) return m[1];
    const parts = window.location.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) return last;
    return null;
}

async function updateFriendButton() {

}

// previous username count, friends since, and join date
async function addBetterStats() {

}

async function updateSocialRow() {
    // Rename Connections to Friends
    const value = await storage.get("renameConnectionsToFriends", true);
    if (value) {
        await waitForSelector('.profile-header-social-counts');
    
        document.querySelectorAll('.profile-header-social-count-label').forEach(label => {
            if (label.textContent.includes("Connection")) {
                label.textContent = label.textContent.replace("Connection", "Friend");
            }
        });
    }

    // Mutural Count
    if (!(Number(userID) === authID)) {
         await waitForSelector('.profile-header-social-counts');
        const mutualsRes = await fetchRoblox.getMutualFriends(userID);
        const ul = document.querySelector('.profile-header-social-counts');
        if (!ul) return;

        const label = (mutualsRes.count === 1) ? 'Mutual' : 'Mutuals';
        const li = document.createElement('li');
        li.innerHTML = `
            <a class="profile-header-social-count" href="#" title="${mutualsRes.count} ${label}" tabindex="0">
                <span class="MuiTypography-root web-blox-css-tss-hzyup-Typography-body1-Typography-root MuiTypography-inherit web-blox-css-mui-clml2g">
                    <b>${mutualsRes.count}</b> 
                    <span class="profile-header-social-count-label">${label}</span>
                </span>
            </a>
        `;
        ul.appendChild(li);
    }
}

async function injectCurrentlyWearing() {
    console.log("[CW] injectCurrentlyWearing() called");

    if (document.getElementById("cw-root")) {
        console.log("[CW] cw-root already exists. Skipping.");
        return;
    }

    const robloxSlot = await new Promise(resolve => {
        const existing = document.querySelector(".profile-currently-wearing");
        if (existing) return resolve(existing);

        const obs = new MutationObserver(() => {
            const el = document.querySelector(".profile-currently-wearing");
            if (el) {
                obs.disconnect();
                resolve(el);
            }
        });

        obs.observe(document.body, { childList: true, subtree: true });
    });

    robloxSlot.removeAttribute("ng-if");
    robloxSlot.removeAttribute("ng-show");
    robloxSlot.removeAttribute("ng-hide");
    robloxSlot.innerHTML = "";

    const root = document.createElement("section");
    root.id = "cw-root";
    robloxSlot.appendChild(root);

    /* ================= UI ================= */

    root.innerHTML = `
    <style>
        .cw-avatar { position:relative; width:100%; border-radius:12px; background:#080808; border:1px solid #1a1a1a; min-height:280px; display:flex; align-items:center; justify-content:center; }
        .cw-avatar img { width:100%; border-radius:12px; display:block; transition:opacity .3s; }
        .cw-avatar button { position:absolute; bottom:8px; padding:4px 10px; font-size:12px; background:#1a1a1a; color:#fff; border:none; border-radius:6px; cursor:pointer; }
        #cw-toggle-bust { left:8px; }
        #cw-toggle-full { right:8px; }

        .cw-placeholder { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:13px; color:#888; }
    </style>

    <div class="cw-card">
        <div class="cw-left">
            <div class="cw-avatar">
                <div id="cw-placeholder-bust" class="cw-placeholder">Loading Bust…</div>
                <img id="cw-bust-img" style="opacity:0">

                <div id="cw-placeholder-full" class="cw-placeholder" style="display:none">Loading Fullbody…</div>
                <img id="cw-full-img" style="opacity:0; display:none">

                <button id="cw-toggle-bust">Bust</button>
                <button id="cw-toggle-full">Fullbody</button>
            </div>
        </div>

        <div class="cw-right">
            <div class="cw-header-row">
                <div class="cw-title">Currently Wearing</div>
                <div class="cw-value"><span class="icon-robux-16x16"></span><span id="cw-total-price">...</span></div>
            </div>

            <div class="cw-tabs-container">
                <div class="cw-slider"></div>
                <div class="cw-tab active" data-tab="assets">Assets</div>
                <div class="cw-tab" data-tab="animations">Animations</div>
                <div class="cw-tab" data-tab="emotes">Emotes</div>
                <div class="cw-tab" data-tab="outfits">Outfits</div>
            </div>

            <div class="cw-page active" data-page="assets"><div class="cw-grid" id="cw-assets-grid"></div></div>
            <div class="cw-page" data-page="animations"><div class="cw-grid"></div></div>
            <div class="cw-page" data-page="emotes"><div class="cw-grid"></div></div>
            <div class="cw-page" data-page="outfits"><div class="cw-grid" id="cw-outfits-grid"></div></div>
        </div>
    </div>
    `;

    /* ================= Avatar Data ================= */

    const avatarData = await fetchRoblox.getUsersAvatar(userID);

    /*
      These are your injection points.
      Replace these later with real Roblox render URLs.
    */
    const BUST_RENDER_URL = (await fetchRoblox.getUserBust(userID)).imageUrl || "";
    const FULLBODY_RENDER_URL = (await fetchRoblox.getUserFullbody(userID)).imageUrl|| "";

    const bustImg = root.querySelector("#cw-bust-img");
    const fullImg = root.querySelector("#cw-full-img");
    const bustPH = root.querySelector("#cw-placeholder-bust");
    const fullPH = root.querySelector("#cw-placeholder-full");

    bustImg.src = BUST_RENDER_URL;
    fullImg.src = FULLBODY_RENDER_URL || BUST_RENDER_URL;

    bustImg.onload = () => {
        bustImg.style.opacity = "1";
        bustPH.style.display = "none";
    };

    fullImg.onload = () => {
        fullImg.style.opacity = "1";
        fullPH.style.display = "none";
    };

    /* ================= View Toggle ================= */

    root.querySelector("#cw-toggle-bust").onclick = () => {
        bustImg.style.display = "block";
        fullImg.style.display = "none";
        bustPH.style.display = bustImg.complete ? "none" : "flex";
        fullPH.style.display = "none";
    };

    root.querySelector("#cw-toggle-full").onclick = () => {
        fullImg.style.display = "block";
        bustImg.style.display = "none";
        fullPH.style.display = fullImg.complete ? "none" : "flex";
        bustPH.style.display = "none";
    };

    /* ================= Assets ================= */

    let total = 0;
    const assetGrid = root.querySelector("#cw-assets-grid");

    avatarData.assets.forEach(a => {
        total += a.price || 0;
        assetGrid.insertAdjacentHTML("beforeend", `
            <a class="cw-item" href="https://www.roblox.com/catalog/${a.id}">
                <img src="${a.thumbnail || ""}">
                <div class="cw-item-name">${a.name}</div>
                <div class="cw-item-price">${a.price ? `<span class="icon-robux-16x16"></span>${a.price}` : "Free"}</div>
            </a>
        `);
    });

    root.querySelector("#cw-total-price").textContent = total.toLocaleString();

    /* ================= Tabs ================= */

    const tabs = root.querySelectorAll(".cw-tab");
    const pages = root.querySelectorAll(".cw-page");
    const slider = root.querySelector(".cw-slider");

    function activateTab(tab) {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        pages.forEach(p => p.classList.toggle("active", p.dataset.page === tab.dataset.tab));
        slider.style.width = tab.offsetWidth + "px";
        slider.style.transform = `translateX(${tab.offsetLeft}px)`;
    }

    tabs.forEach(t => t.onclick = () => activateTab(t));
    activateTab(root.querySelector(".cw-tab.active"));
}


if (!(Number(userID) === authID)) {
    updateFriendButton();
}

injectCurrentlyWearing();