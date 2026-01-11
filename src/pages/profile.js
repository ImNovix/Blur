import { fetchRoblox } from "../helpers/robloxAPI.js";
import { waitForSelector } from "../helpers/elements.js";
import { Storage } from "../helpers/storage.js";
import { formatProfileUserLanguage } from "../helpers/locale.js"
import { usernameChatColors } from "../constaints/profile.js";

const storage = new Storage();
await storage.initDefaults();

const userID = getProfileUserIdFromUrl();
const authID = (await fetchRoblox.getAuth()).id;
const userRes = await fetchRoblox.getUserDetails(userID);

function getProfileUserIdFromUrl() {
    const m = window.location.pathname.match(/\/users\/(\d+)(?:\/|$)/i);
    if (m) return m[1];
    const parts = window.location.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) return last;
    return null;
}

async function updateFriendButton() {
  // Wait for either friend or unfriend button to appear
  const button = await waitForSelector("#friend-button, #unfriend-button");

  if (!button) return; // Didn't appear within timeout

  // Example: change style
  button.style.borderRadius = "6px";
  button.style.fontWeight = "600";
  button.style.transition = "background-color 0.2s ease";

  // Example: change text based on state
  if (button.id === "friend-button") {
    button.textContent = "Add Friend";
  } else {
    button.textContent = "Unfriend";
  }
}

async function addBetterStats() {
    const showUsernameCount = await storage.get('showUsernameCount', true);
    const showRevampedJoinDate = await storage.get('showRevampedJoinDate', true);
    const showFriendsSince = await storage.get('showFriendsSince', true);

    // --- MutationObserver to remove Roblox's default stats container dynamically ---
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.id === 'profile-statistics-container') {
                    node.remove();
                }
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // --- Remove it immediately if it already exists ---
    const defaultStats = document.querySelector('#profile-statistics-container');
    if (defaultStats) defaultStats.remove();

    // --- Wait for tooltip element ---
    const tooltip = await waitForSelector('.tooltip-pastnames');
    if (!tooltip) return;

    // Wait until tooltip's data-original-title has content
    await new Promise(resolve => {
        const check = () => {
            if (tooltip.getAttribute('data-original-title')?.trim()) resolve();
            else requestAnimationFrame(check);
        };
        check();
    });

    // --- Previous Usernames ---
    if (showUsernameCount) {
        const usernames = tooltip
            .getAttribute('data-original-title')
            .split(',')
            .map(u => u.trim())
            .filter(Boolean);

        // Update Roblox's existing span with count
        const pastUsernameSpan = document.querySelector('.profile-name-history .text-pastname');
        if (pastUsernameSpan) {
            const originalText = pastUsernameSpan.textContent.split('(')[0].trim();
            pastUsernameSpan.textContent = `${originalText} (${usernames.length})`;
        }
    }

    // --- Wait for footer ---
    const footer = await waitForSelector('.profile-about-footer');
    if (!footer) return;

    // Helper to create vertical block stats
    const createStatDiv = (text) => {
        const div = document.createElement('div');
        div.className = 'profile-name-history';
        div.style.display = 'block';       // vertical stacking
        div.style.marginTop = '4px';       // spacing
        div.innerHTML = `<span class="text-pastname ng-binding">${text}</span>`;
        return div;
    };

    // --- Friends Since ---
    if (showFriendsSince) {
        const friendsSinceDate = await fetchRoblox.getFriendshipDuration(userID);
        if (friendsSinceDate && friendsSinceDate !== "Unknown") {
            const friendsDiv = createStatDiv(`Friends Since: ${friendsSinceDate}`);
            footer.appendChild(friendsDiv);
        }
    }

    // --- Join Date ---
    if (showRevampedJoinDate && userRes?.created) {
        const createdDate = new Date(userRes.created);
        const formattedDate = createdDate.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const joinDiv = createStatDiv(`Joined: ${formattedDate}`);
        footer.appendChild(joinDiv);
    }
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
        const showMuturals = await storage.get('showMutualFriends', true);
        if (showMuturals) {
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
}

async function injectCurrentlyWearing() {
    const inject = storage.get('injectCustomCurrenlyWearing', true);
    if (inject) {
        /* ================= Prevent Roblox's default Currently Wearing ================= */
        const observer = new MutationObserver(mutations => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node instanceof HTMLElement && node.classList.contains("profile-currently-wearing")) {
                        node.remove();
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });

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

        /* ================= Wait for target element ================= */
        function waitForTarget() {
            return new Promise(resolve => {
                const el = document.querySelector("#content > div.profile-platform-container > div > div:nth-child(4) > div:nth-child(2) > div:nth-child(1)");
                if (el) return resolve(el);

                const obs = new MutationObserver(() => {
                    const el = document.querySelector("#content > div.profile-platform-container > div > div:nth-child(4) > div:nth-child(2) > div:nth-child(1)");
                    if (el) {
                        obs.disconnect();
                        resolve(el);
                    }
                });

                obs.observe(document.body, { childList: true, subtree: true });
            });
        }

        const targetEl = await waitForTarget();

        // Remove Roblox's default Currently Wearing if it exists
        const defaultCW = document.querySelector(".profile-currently-wearing");
        if (defaultCW) defaultCW.remove();

        // Prevent duplicates
        if (document.getElementById("cw-root")) return;

        /* ================= Phase 1 – Instant UI ================= */
        const root = document.createElement("section");
        root.id = "cw-root";

        // Inject right after the target element
        targetEl.insertAdjacentElement("afterend", root);

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

        /* ================= Tabs & Toggle ================= */
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

        const bustImg = root.querySelector("#cw-bust-img");
        const fullImg = root.querySelector("#cw-full-img");
        const bustPH = root.querySelector("#cw-placeholder-bust");
        const fullPH = root.querySelector("#cw-placeholder-full");
        const toggleBtn = root.querySelector("#cw-toggle");

        let isBust = true;
        toggleBtn.onclick = () => {
            isBust = !isBust;
            toggleBtn.textContent = isBust ? "Bust" : "Fullbody";
            bustImg.style.display = isBust ? "block" : "none";
            fullImg.style.display = isBust ? "none" : "block";
        };

        Promise.all([
            fetchRoblox.getUserBust(userID),
            fetchRoblox.getUserFullbody(userID)
        ]).then(([bust, full]) => {
            bustImg.src = bust.imageUrl || "";
            fullImg.src = full.imageUrl || bust.imageUrl || "";

            bustImg.onload = () => { bustImg.style.opacity = 1; bustPH.style.display = "none"; };
            fullImg.onload = () => { fullImg.style.opacity = 1; fullPH.style.display = "none"; };
        });

        /* ================= Phase 2 – Progressive Data Loading ================= */
        (async () => {
            const gridAssets = root.querySelector("#cw-assets-grid");
            const gridAnimations = root.querySelector('[data-page="animations"] .cw-grid');
            const gridEmotes = root.querySelector('[data-page="emotes"] .cw-grid');
            const gridOutfits = root.querySelector("#cw-outfits-grid");

            const avatarData = await fetchRoblox.getUsersAvatar(userID);

            // Combine assets + animations + emotes for thumbnails/prices
            const allAssetItems = [
                ...avatarData.assets.map(a => ({ id: a.id, name: a.name, currentVersionId: a.currentVersionId })),
                ...avatarData.animations.map(a => ({ id: a.id, name: a.name, currentVersionId: a.currentVersionId })),
                ...avatarData.emotes.map(e => ({ id: e.assetId, name: e.assetName, currentVersionId: e.assetId }))
            ];

            // Render placeholders immediately
            allAssetItems.forEach(a => {
                let grid;
                if (avatarData.assets.some(x => x.id === a.id)) grid = gridAssets;
                else if (avatarData.animations.some(x => x.id === a.id)) grid = gridAnimations;
                else if (avatarData.emotes.some(x => x.assetId === a.id)) grid = gridEmotes;
                if (!grid) return;

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

            // Fetch thumbnails and prices for assets/animations/emotes
            const assetIds = allAssetItems.map(a => a.id).join(",");
            fetchRoblox.getAssetThumbnail(assetIds).then(assetThumbs => {
                assetThumbs.data.forEach(t => {
                    const card = document.querySelector(`[data-asset-id="${t.targetId}"]`);
                    if (card && t.imageUrl) {
                        const img = card.querySelector("img");
                        const placeholder = card.querySelector(".cw-item-thumb-placeholder");
                        img.src = t.imageUrl;
                        img.onload = () => { img.style.display = "block"; if (placeholder) placeholder.remove(); };
                    }
                });
            });

            getAssetDetailsWithRetry(assetIds).then(assetDetails => {
                let total = 0;
                assetDetails.data.forEach(a => {
                    const price = a.price ?? 0;
                    total += price;
                    const card = document.querySelector(`[data-asset-id="${a.id}"]`);
                    if (card) card.querySelector(".cw-item-price").innerHTML = price ? `<span class="icon-robux-16x16"></span>${price}` : "Free";
                });
                root.querySelector("#cw-total-price").textContent = total.toLocaleString();
            });

            // Render outfits
            const detailedOutfits = await fetchRoblox.getUserOutfits(userID);

            detailedOutfits.forEach(o => {
                const card = document.createElement("a");
                card.className = "cw-item";
                card.target = "_blank";
                card.innerHTML = `
                    <div class="cw-item-thumb-placeholder"></div>
                    <img src="${o.thumbnail || ""}" style="display:${o.thumbnail ? "block" : "none"}">
                    <div class="cw-item-name">${o.name}</div>
                `;
                gridOutfits.appendChild(card);
            });
        })();
    }
}

async function updateDisplayNameChatColor() {
  const enabled = storage.get("updateDisplayNameChatColor", true);
  if (!enabled) return;

  const { name } = userRes;

  const getUsernameChatColor = (username) => {
    let value = 0;
    const len = username.length;

    for (let i = 0; i < len; i++) {
      let cValue = username.charCodeAt(i);
      let reverseIndex = len - i;

      if (len % 2 === 1) {
        reverseIndex -= 1;
      }

      if (reverseIndex % 4 >= 2) {
        cValue = -cValue;
      }

      value += cValue;
    }

    const index =
      value -
      Math.floor(value / usernameChatColors.length) *
        usernameChatColors.length;

    return usernameChatColors[index];
  };

  // 🔍 Grab the display name element
  const displayNameEl = document.querySelector(
    ".profile-header-title-container .MuiTypography-root"
  );

  if (!displayNameEl) return;

  displayNameEl.style.setProperty(
    "color",
    getUsernameChatColor(name),
    "important"
  );
}


if (!(Number(userID) === authID)) {
    updateFriendButton();
}
injectCurrentlyWearing();
updateDisplayNameChatColor();
updateSocialRow();
addBetterStats();