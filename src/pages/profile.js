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
    console.log("[CW] userID =", userID);

    // Prevent double-mount
    if (document.getElementById("cw-root")) {
        console.log("[CW] cw-root already exists. Skipping.");
        return;
    }

    console.log("[CW] Waiting for Roblox .profile-currently-wearing…");

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

    console.log("[CW] Found Roblox slot:", robloxSlot);

    // Freeze Angular
    robloxSlot.removeAttribute("ng-if");
    robloxSlot.removeAttribute("ng-show");
    robloxSlot.removeAttribute("ng-hide");

    // Wipe Roblox UI
    robloxSlot.innerHTML = "";

    // Create our root
    const root = document.createElement("section");
    root.id = "cw-root";
    robloxSlot.appendChild(root);

    console.log("[CW] Roblox slot hijacked");

    // ================= UI =================
    root.innerHTML = `
    <div class="cw-card">
        <div class="cw-left">
            <div class="cw-avatar">
                <div id="cw-avatar-viewport"></div>
                <img id="cw-avatar-2d" style="opacity:1">
                <button id="cw-toggle-2d">2D</button>
                <button id="cw-toggle-3d">3D</button>
            </div>
        </div>
        <div class="cw-right">
            <div class="cw-header-row">
                <div class="cw-title-group">
                    <div class="cw-title">Currently Wearing</div>
                    <div class="cw-value">
                        <span class="icon-robux-16x16"></span>
                        <span id="cw-total-price">...</span>
                    </div>
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

    // ================= Avatar =================
    console.log("[CW] Fetching avatar data…");
    const avatarData = await fetchRoblox.getUsersAvatar(userID);
    console.log("[CW] Avatar data:", avatarData);

    const img2D = root.querySelector("#cw-avatar-2d");
    const headshot = await fetchRoblox.getUserHeadshot(userID);
    img2D.src = headshot.imageURL || "";

    const toggle2D = root.querySelector("#cw-toggle-2d");
    const toggle3D = root.querySelector("#cw-toggle-3d");
    const viewport = root.querySelector("#cw-avatar-viewport");

    toggle2D.onclick = () => {
        viewport.style.display = "none";
        img2D.style.display = "block";
        console.log("[CW] 2D mode");
    };

    toggle3D.onclick = () => {
        viewport.style.display = "block";
        img2D.style.display = "none";
        console.log("[CW] 3D mode");
    };

    // Move Roblox canvas if it exists
    const canvas = document.querySelector(".profile-currently-wearing canvas");
    if (canvas) {
        console.log("[CW] Moving Roblox 3D canvas");
        viewport.appendChild(canvas);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
    }

    // ================= Assets =================
    const assetGrid = root.querySelector("#cw-assets-grid");
    let total = 0;

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
    console.log("[CW] Total:", total);

    // ================= Animations & Emotes =================
    ["animations","emotes"].forEach(tab => {
        const grid = root.querySelector(`.cw-page[data-page="${tab}"] .cw-grid`);
        (avatarData[tab] || []).forEach(item => {
            const id = item.id || item.assetId;
            const name = item.name || item.assetName;
            const thumb = item.thumbnail || "";
            const price = item.price ? `<span class="icon-robux-16x16"></span>${item.price}` : "Free";

            grid.insertAdjacentHTML("beforeend", `
                <a class="cw-item" href="https://www.roblox.com/catalog/${id}">
                    <img src="${thumb}">
                    <div class="cw-item-name">${name}</div>
                    <div class="cw-item-price">${price}</div>
                </a>
            `);
        });
    });

    // ================= Outfits =================
    console.log("[CW] Fetching outfits…");
    const outfitGrid = root.querySelector("#cw-outfits-grid");
    const outfits = await fetchRoblox.getUserOutfits(userID);

    outfits.forEach(o => {
        outfitGrid.insertAdjacentHTML("beforeend", `
            <div class="cw-item">
                <img src="${o.thumbnail || ""}">
                <div class="cw-item-name">${o.name}</div>
                <div class="cw-item-price">Outfit</div>
            </div>
        `);
    });

    console.log("[CW] Rendered outfits:", outfits.length);
}

if (!(Number(userID) === authID)) {
    updateFriendButton();
}

injectCurrentlyWearing();