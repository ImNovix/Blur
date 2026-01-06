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

    // 1. Run immediately
    clearElements();

    // 2. Setup observer to catch elements if Roblox injects them late
    const targetNode = await waitForSelector("#content > div.profile-platform-container > div", 5000).catch(() => null);
    
    if (targetNode) {
        const observer = new MutationObserver((mutations) => {
            clearElements();
        });

        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
    }
}

async function injectCurrentlyWearing() {
    // Wait for the target injection anchor
    const anchor = await waitForSelector("#content > div.profile-platform-container > div > div:nth-child(4) > div:nth-child(2) > div:nth-child(1)");
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
        .cw-title { font-size: 18px; font-weight: 600; margin-right: 4px; }
        .cw-value { font-size: 16px; color: #fff; font-weight: 700; display: flex; align-items: center; gap: 4px; }
        
        .cw-title-group .icon-robux-16x16 { display: inline-block; transform: scale(0.9); margin-top: 1px; }

        .cw-tabs-container { position: relative; display: flex; background: #161616; padding: 3px; border-radius: 9px; border: 1px solid #222; }
        .cw-tab { position: relative; z-index: 2; padding: 6px 16px; font-size: 12px; font-weight: 500; color: #888; cursor: pointer; transition: color 0.25s ease; text-align: center; min-width: 85px; }
        .cw-tab.active { color: #fff; }
        .cw-slider { position: absolute; top: 3px; left: 3px; height: calc(100% - 6px); background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 7px; transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1.1); z-index: 1; }

        .cw-page { display: none; height: 240px; overflow-y: auto; padding-right: 5px; }
        .cw-page.active { display: block; }
        
        .cw-page::-webkit-scrollbar { width: 4px; }
        .cw-page::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }

        .cw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
        .cw-item { background: #161616; border: 1px solid #222; border-radius: 10px; padding: 8px; text-decoration: none !important; transition: transform 0.1s; }
        .cw-item:hover { transform: translateY(-2px); border-color: #333; }
        .cw-item img { width: 100%; aspect-ratio: 1/1; border-radius: 6px; background: #000; margin-bottom: 6px; }
        .cw-item-name { font-size: 11px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
        .cw-item-price { font-size: 10px; color: #fff; display: flex; align-items: center; gap: 2px; margin-top: 2px; }
    </style>

    <div class="cw-card">
        <div class="cw-left">
            <div class="cw-avatar"><img id="cw-main-avatar" src="" style="opacity:0"></div>
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
            <div class="cw-page" data-page="outfits"><div class="cw-grid"></div></div>
        </div>
    </div>
    `;

    anchor.insertAdjacentElement("afterend", root);

    // Tab Slider Logic
    const tabs = root.querySelectorAll(".cw-tab");
    const pages = root.querySelectorAll(".cw-page");
    const slider = root.querySelector(".cw-slider");
    const updateSlider = (tab) => {
        slider.style.width = `${tab.offsetWidth}px`;
        slider.style.left = `${tab.offsetLeft}px`;
    };
    
    updateSlider(root.querySelector(".cw-tab.active"));
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove("active"));
            pages.forEach(p => p.classList.remove("active"));
            tab.classList.add("active");
            root.querySelector(`[data-page="${tab.dataset.tab}"]`).classList.add("active");
            updateSlider(tab);
        };
    });

    // Fetch and Populate
    try {
        const avatarData = await fetchRoblox.getAvatar(userID);
        const mainImg = document.getElementById("cw-main-avatar");
        
        const thumb = await fetchRoblox.getThumbnails([{ targetId: userID, type: "AvatarFull", size: "420x420" }]);
        mainImg.src = thumb[0].imageUrl;
        mainImg.style.opacity = "1";

        const assetGrid = document.getElementById("cw-assets-grid");
        const assetIds = avatarData.assets.map(a => a.id);
        
        const [thumbnails, productInfo] = await Promise.all([
            fetchRoblox.getThumbnails(assetIds.map(id => ({ targetId: id, type: "Asset", size: "150x150" }))),
            fetchRoblox.getEconomyInfo(assetIds)
        ]);

        let totalPrice = 0;
        avatarData.assets.forEach((asset, index) => {
            const price = productInfo[asset.id]?.PriceInRobux || 0;
            totalPrice += price;

            const itemEl = document.createElement("a");
            itemEl.className = "cw-item";
            itemEl.href = `https://www.roblox.com/catalog/${asset.id}`;
            itemEl.innerHTML = `
                <img src="${thumbnails[index]?.imageUrl || ''}">
                <div class="cw-item-name">${asset.name}</div>
                <div class="cw-item-price">${price > 0 ? `<span class="icon-robux-16x16"></span>${price}` : 'Free'}</div>
            `;
            assetGrid.appendChild(itemEl);
        });

        document.getElementById("cw-total-price").textContent = totalPrice.toLocaleString();
    } catch (err) {
        console.error("[CW] Error:", err);
    }
}


if (!(Number(userID) === authID)) {
    addMutualsRow();
    addFriendsSinceRow();
}

renameConnectionsToFriends();
addPreviousUsernamesCount();
addUpdatedJoinDate();
injectCurrentlyWearing();
removeOfficialAvatar