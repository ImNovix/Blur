import { fetchRoblox } from "../helpers/robloxAPI.js";
import { waitForSelector } from "../helpers/elements.js";
import { Storage } from "../helpers/storage.js";

const storage = new Storage();
await storage.initDefaults();

function getProfileUserIdFromUrl() {
    const m = window.location.pathname.match(/\/users\/(\d+)(?:\/|$)/i);
    if (m) return m[1];
    const parts = window.location.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) return last;
    return null;
}

const userID = getProfileUserIdFromUrl();
const authID = (await fetchRoblox.getAuth()).id;

console.log("userID:" + userID + "authID:" + authID);

async function addMutualsRow() {
    await waitForSelector('.profile-header-social-counts');

    const mutualsRes = await fetchRoblox.getMutualFriends(userID);
    console.log(mutualsRes);

    const ul = document.querySelector('.profile-header-social-counts');
    if (!ul) return;

    let label;
    if (mutualsRes.count > 1 || mutualsRes.count === 0) {
        label = 'Mutuals'
    } else {
        label = 'Mutual'
    }

    // Create new li element
    const li = document.createElement('li');
    li.innerHTML = `
        <a class="profile-header-social-count" href="#" title="${mutualsRes.count} ${label}" tabindex="0">
            <span class="MuiTypography-root web-blox-css-tss-hzyup-Typography-body1-Typography-root MuiTypography-inherit web-blox-css-mui-clml2g">
                <b>${mutualsRes.count}</b> 
                <span class="profile-header-social-count-label">${label}</span>
            </span>
        </a>
    `;

    // Append at the end
    ul.appendChild(li);
}

async function addFriendsSinceRow() {
    await waitForSelector('.profile-about-footer');

    const friendsSinceDate = await fetchRoblox.getFriendshipDuration(userID);
    if (friendsSinceDate === "Unknown") return;

    const footer = document.querySelector('.border-top.profile-about-footer');
    if (!footer) return;

    // Create a wrapper div to force a new row
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.marginTop = '4px';
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';

    // Create the content span using past usernames styles
    const span = document.createElement('span');
    span.className = 'profile-name-history';
    span.innerHTML = `
        <span class="text-pastname ng-binding">
            Friends Since: ${friendsSinceDate}
        </span>
    `;

    wrapper.appendChild(span);

    // Insert wrapper after the existing past usernames
    const pastUsernames = footer.querySelector('.profile-name-history');
    if (pastUsernames) {
        pastUsernames.parentNode.insertBefore(wrapper, pastUsernames.nextSibling);
    } else {
        footer.appendChild(wrapper);
    }
}

async function renameConnectionsToFriends() {
    const value = await storage.get("renameConnectionsToFriends", true);
    if (!value) return;

    await waitForSelector('.profile-header-social-counts');

    // Rename header labels
    document.querySelectorAll('.profile-header-social-count-label').forEach(label => {
        if (label.textContent.includes("Connection")) {
            label.textContent = label.textContent.replace("Connection", "Friend");
        }
    });

    // Function to rename the Remove Connection button to Unfriend
    const renameButton = (button) => {
        const textSpan = button.querySelector("span.web-blox-css-tss-1283320-Button-textContainer");
        if (textSpan && textSpan.textContent.trim() === "Remove Connection") {
            textSpan.textContent = "Unfriend";
        }
    };

    // Rename existing buttons
    document.querySelectorAll('button').forEach(renameButton);

    // Observe DOM for dynamically added buttons
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.tagName === "BUTTON") {
                    renameButton(node);
                } else if (node.nodeType === 1) {
                    node.querySelectorAll('button').forEach(renameButton);
                }
            });
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

async function addPreviousUsernamesCount() {
    await waitForSelector('.tooltip-pastnames');

    const tooltip = document.querySelector('.tooltip-pastnames');
    if (!tooltip) return;

    // Wait until data-original-title is not empty
    await new Promise(resolve => {
        const check = () => {
            if (tooltip.getAttribute('data-original-title')?.trim()) {
                resolve();
            } else {
                requestAnimationFrame(check);
            }
        };
        check();
    });

    const data = tooltip.getAttribute('data-original-title');
    const usernames = data.split(',').map(u => u.trim()).filter(u => u.length > 0);
    const usernameCount = usernames.length;

    console.log("Previous usernames count:", usernameCount);

    const pastUsernameSpan = document.querySelector('.profile-name-history .text-pastname');
    if (pastUsernameSpan) {
        pastUsernameSpan.textContent = `Previous usernames (${usernameCount})`;
    }
}

async function addUpdatedJoinDate() {
    
}

async function removeOfficialAvatar() {
    // Primary and fallback selectors
    const selectors = [
        "#content > div.profile-platform-container > div > div.relative",
        "#content > div.profile-platform-container > div > div:nth-child(4) > div:nth-child(2) > div.profile-currently-wearing"
    ];

    const clearElements = () => {
        selectors.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) {
                el.remove();
                console.log(`[CW] Removed: ${selector}`);
            }
        });
    };

    clearElements();

    // Observe container for late injections
    const targetNode = await waitForSelector(
        "#content > div.profile-platform-container > div",
        5000
    ).catch(() => null);

    if (targetNode) {
        const observer = new MutationObserver((mutations, obs) => {
            clearElements();
            obs.disconnect();
        });
        observer.observe(targetNode, { childList: true, subtree: true });
    }

    // Inject after a short delay
    setTimeout(() => injectCurrentlyWearing(), 50);
}

async function injectCurrentlyWearing() {
    // Try main anchor first
    let anchor = document.querySelector(
        "#content > div.profile-platform-container > div > div:nth-child(3) > div:nth-child(2) > div:nth-child(1)"
    );

    // Fallback: About section container
    if (!anchor) {
        anchor = document.querySelector(
            ".section.profile-about.ng-scope"
        );
    }

    if (!anchor || document.getElementById("cw-root")) return;

    const root = document.createElement("section");
    root.id = "cw-root";
    
    root.innerHTML = `
    <style>
        #cw-root { width: 100%; margin-bottom: 24px; font-family: 'HCo Gotham SSm', sans-serif; }
        .cw-card { display: flex; gap: 20px; padding: 16px; border-radius: 14px; background: #0f0f0f; border: 1px solid #1f1f1f; color: #fff; }
        .cw-left { width: 280px; flex-shrink: 0; }
        .cw-avatar { width: 100%; border-radius: 12px; background: #080808; overflow: hidden; border: 1px solid #1a1a1a; min-height: 280px; }
        .cw-avatar img { width: 100%; display: block; transition: opacity 0.3s; }

        .cw-right { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .cw-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }

        .cw-title-group { display: flex; align-items: center; gap: 6px; }
        .cw-title { font-size: 18px; font-weight: 600; }
        .cw-value { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 4px; }

        .cw-tabs-container { position: relative; display: flex; background: #161616; padding: 3px; border-radius: 9px; border: 1px solid #222; }
        .cw-tab { z-index: 2; padding: 6px 16px; font-size: 12px; color: #888; cursor: pointer; min-width: 85px; text-align: center; }
        .cw-tab.active { color: #fff; }
        .cw-slider { position: absolute; top: 3px; left: 3px; height: calc(100% - 6px); background: rgba(255,255,255,0.1); border-radius: 7px; transition: all 0.25s ease; z-index: 1; }

        .cw-page { display: none; height: 240px; overflow-y: auto; }
        .cw-page.active { display: block; }

        .cw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
        .cw-item { background: #161616; border: 1px solid #222; border-radius: 10px; padding: 8px; color: #fff; text-decoration: none; }
        .cw-item img { width: 100%; aspect-ratio: 1/1; border-radius: 6px; margin-bottom: 6px; }
        .cw-item-name { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cw-item-price { font-size: 10px; opacity: 0.75; }
    </style>

    <div class="cw-card">
        <div class="cw-left">
            <div class="cw-avatar">
                <img id="cw-main-avatar" style="opacity:0">
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

            <div class="cw-page active" data-page="assets">
                <div class="cw-grid" id="cw-assets-grid"></div>
            </div>
            <div class="cw-page" data-page="animations"><div class="cw-grid"></div></div>
            <div class="cw-page" data-page="emotes"><div class="cw-grid"></div></div>
            <div class="cw-page" data-page="outfits">
                <div class="cw-grid" id="cw-outfits-grid"></div>
            </div>
        </div>
    </div>
    `;

    // Insert the card **after the anchor** container
    anchor.insertAdjacentElement("afterend", root);

    // Tabs logic + fetch avatar data + populate grids (assets, animations, emotes, outfits)
    try {
        const avatarData = await fetchRoblox.getUsersAvatar(userID);

        const mainImg = root.querySelector("#cw-main-avatar");
        mainImg.src = (await fetchRoblox.getUserHeadshot(userID)).imageURL || "";
        mainImg.style.opacity = "1";

        // Populate assets
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

        // Populate animations
        const animGrid = root.querySelector('.cw-page[data-page="animations"] .cw-grid');
        avatarData.animations.forEach(a => {
            animGrid.insertAdjacentHTML('beforeend', `
                <a class="cw-item" href="https://www.roblox.com/catalog/${a.id}">
                    <img src="${a.thumbnail || ""}">
                    <div class="cw-item-name">${a.name}</div>
                    <div class="cw-item-price">${a.price ? `<span class="icon-robux-16x16"></span>${a.price}` : "Free"}</div>
                </a>
            `);
        });

        // Populate emotes
        const emoteGrid = root.querySelector('.cw-page[data-page="emotes"] .cw-grid');
        avatarData.emotes.forEach(e => {
            emoteGrid.insertAdjacentHTML('beforeend', `
                <a class="cw-item" href="https://www.roblox.com/catalog/${e.assetId}">
                    <img src="${e.thumbnail || ""}">
                    <div class="cw-item-name">${e.assetName}</div>
                    <div class="cw-item-price">${e.price ? `<span class="icon-robux-16x16"></span>${e.price}` : "Free"}</div>
                </a>
            `);
        });

        // Outfits
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

    } catch (err) {
        console.error("[CW] Error:", err);
    }
}


if (!(Number(userID) === authID)) {
    addMutualsRow();
    addFriendsSinceRow();
}

removeOfficialAvatar();
renameConnectionsToFriends();
addPreviousUsernamesCount();
addUpdatedJoinDate();