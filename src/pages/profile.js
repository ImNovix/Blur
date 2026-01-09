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
    const button = document.querySelector("")

}

// previous username count, friends since, join date, and locale
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

    /* ================= Rate-limit safe asset fetch ================= */

    async function getAssetDetailsWithRetry(assetIds) {
        while (true) {
            try {
                return await fetchRoblox.getAssetDetails(assetIds);
            } catch (err) {
                if (String(err).includes("429")) {
                    console.warn("[CW] Asset details rate-limited. Retrying in 5s...");
                    await new Promise(r => setTimeout(r, 5000));
                    continue;
                }
                throw err;
            }
        }
    }

    /* ================= Wait for Roblox slot ================= */

    function waitForCWSlot() {
        return new Promise(resolve => {
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
    }

    /* ================= Prevent duplicates ================= */

    if (document.getElementById("cw-root")) return;

    const robloxSlot = await waitForCWSlot();

    /* ================= Phase 1 – Instant UI ================= */

    robloxSlot.removeAttribute("ng-if");
    robloxSlot.removeAttribute("ng-show");
    robloxSlot.removeAttribute("ng-hide");
    robloxSlot.innerHTML = "";

    const root = document.createElement("section");
    root.id = "cw-root";
    robloxSlot.appendChild(root);

    root.innerHTML = `
    <div class="cw-card">
        <div class="cw-left">
            <div class="cw-avatar">
                <div id="cw-placeholder-bust" class="cw-placeholder"></div>
                <img id="cw-bust-img" style="opacity:0">

                <div id="cw-placeholder-full" class="cw-placeholder" style="display:none"></div>
                <img id="cw-full-img" style="opacity:0; display:none">
            </div>
            <button id="cw-toggle">Bust</button>
        </div>

        <div class="cw-right">
            <div class="cw-top-bar">
                <div class="cw-header-left">
                    <div class="cw-title">Currently Wearing</div>
                    <span class="icon-robux-16x16"></span>
                    <span id="cw-total-price">...</span>
                </div>

                <div class="cw-tabs-container">
                    <div class="cw-slider"></div>
                    <div class="cw-tab active" data-tab="assets">Assets</div>
                    <div class="cw-tab" data-tab="animations">Animations</div>
                    <div class="cw-tab" data-tab="emotes">Emotes</div>
                    <div class="cw-tab" data-tab="outfits">Outfits</div>
                </div>
            </div>

            <div class="cw-page active" data-page="assets"><div class="cw-grid" id="cw-assets-grid"></div></div>
            <div class="cw-page" data-page="animations"><div class="cw-grid"></div></div>
            <div class="cw-page" data-page="emotes"><div class="cw-grid"></div></div>
            <div class="cw-page" data-page="outfits"><div class="cw-grid" id="cw-outfits-grid"></div></div>
        </div>
    </div>
    `;

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

    /* ================= View Toggle ================= */

    const bustImg = root.querySelector("#cw-bust-img");
    const fullImg = root.querySelector("#cw-full-img");
    const bustPH = root.querySelector("#cw-placeholder-bust");
    const fullPH = root.querySelector("#cw-placeholder-full");
    const toggleBtn = root.querySelector("#cw-toggle");

    let isBust = true;

    toggleBtn.onclick = () => {
        isBust = !isBust;
        toggleBtn.textContent = isBust ? "Bust" : "Full";

        bustImg.style.display = isBust ? "block" : "none";
        fullImg.style.display = isBust ? "none" : "block";
    };

    /* ================= Phase 2 – Progressive Data Loading ================= */

    (async () => {
        const grid = root.querySelector("#cw-assets-grid");
        const avatarData = await fetchRoblox.getUsersAvatar(userID);
        
        // Step 1: Render cards immediately with just names
        avatarData.assets.forEach(a => {
            const card = document.createElement("a");
            card.className = "cw-item";
            card.href = `https://www.roblox.com/catalog/${a.id}`;
            card.target = "_blank";
            card.dataset.assetId = a.id;
            
            card.innerHTML = `
                <div class="cw-item-thumb-placeholder"></div>
                <img style="display:none">
                <div class="cw-item-name">${a.name}</div>
                <div class="cw-item-price">...</div>
            `;
            
            grid.appendChild(card);
        });

        const assetIds = avatarData.assets.map(a => a.id).join(",");

        // Step 2: Load thumbnails and update as they arrive
        fetchRoblox.getAssetThumbnail(assetIds).then(assetThumbs => {
            assetThumbs.data.forEach(t => {
                const card = grid.querySelector(`[data-asset-id="${t.targetId}"]`);
                if (card && t.imageUrl) {
                    const img = card.querySelector("img");
                    const placeholder = card.querySelector(".cw-item-thumb-placeholder");
                    
                    img.src = t.imageUrl;
                    img.onload = () => {
                        img.style.display = "block";
                        if (placeholder) placeholder.remove();
                    };
                }
            });
        });

        // Step 3: Load prices and update total
        getAssetDetailsWithRetry(assetIds).then(assetDetails => {
            let total = 0;
            
            assetDetails.data.forEach(a => {
                const price = a.price ?? 0;
                total += price;
                
                const card = grid.querySelector(`[data-asset-id="${a.id}"]`);
                if (card) {
                    const priceEl = card.querySelector(".cw-item-price");
                    priceEl.innerHTML = price ? `<span class="icon-robux-16x16"></span>${price}` : "Free";
                }
            });

            root.querySelector("#cw-total-price").textContent = total.toLocaleString();
        });

        // Step 4: Load avatar images
        Promise.all([
            fetchRoblox.getUserBust(userID),
            fetchRoblox.getUserFullbody(userID)
        ]).then(([bust, full]) => {
            bustImg.src = bust.imageUrl || "";
            fullImg.src = full.imageUrl || bust.imageUrl || "";

            bustImg.onload = () => { bustImg.style.opacity = 1; bustPH.style.display = "none"; };
            fullImg.onload = () => { fullImg.style.opacity = 1; fullPH.style.display = "none"; };
        });
    })();
}


if (!(Number(userID) === authID)) {
    updateFriendButton();
}

injectCurrentlyWearing();