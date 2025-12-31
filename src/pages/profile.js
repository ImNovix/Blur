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


if (!(Number(userID) === authID)) {
    addMutualsRow();
    addFriendsSinceRow();
}

renameConnectionsToFriends();
addPreviousUsernamesCount();