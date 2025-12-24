import { waitForSelector } from "../helpers/elements.js";
import { makeFriendCardHTML } from "./cards.js";
import { getUserPresence, getUserDetails } from "../modules/users.js";
import { getUserHeadshot } from "../modules/thumbnails.js";
import { bestFriends } from "../../local/vars.js";

console.log("[pages/friends.js] Loaded");

const extensionURL = await chrome.runtime.getURL('');

function getActiveFriendsTab() {
  const hash = location.hash.toLowerCase();
  if (hash.includes("friends")) return "friends";
  if (hash.includes("following")) return "following";
  if (hash.includes("followers")) return "followers";
  return null;
}

let injecting = false;

async function injectBestFriendsSection() {
  if (getActiveFriendsTab() !== "friends") return;
  if (injecting) return;
  injecting = true;

  const connectionsSubtitle = await waitForSelector(".friends-subtitle");
  if (!connectionsSubtitle) {
    injecting = false;
    return;
  }

  if (document.querySelector(".blur-best-friends")) {
    injecting = false;
    return;
  }

  const connectionsSection = connectionsSubtitle.closest(".friends-content.section");
  if (!connectionsSection) {
    injecting = false;
    return;
  }

  const section = document.createElement("div");
  section.className = "friends-content section blur-best-friends";
  section.innerHTML = `
    <div class="container-header">
      <h2 class="friends-subtitle">Best Friends (${bestFriends.length})</h2>
    </div>
    <ul class="hlist avatar-cards blur-best-friends-cards"></ul>
  `;

  connectionsSection.parentNode.insertBefore(section, connectionsSection);
  injecting = false;
}

async function injectBestFriendCards() {
  const list = document.querySelector(".blur-best-friends-cards");
  if (!list) return;

  const existingIds = new Set(Array.from(list.children).map(card => card.id));
  const cardElements = [];

  for (const userId of bestFriends) {
    if (existingIds.has(String(userId))) continue;

    const html = await makeFriendCardHTML(userId);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html.trim();
    const card = wrapper.firstElementChild;
    card.style.position = 'relative';

    // Top-right button
    const btn = document.createElement("button");
    btn.className = "user-options-btn";

    const img = document.createElement("img");
    img.src = extensionURL + "src/images/more.png";
    img.alt = "Options";
    btn.appendChild(img);

    // Dropdown container
    const dropdown = document.createElement("div");
    dropdown.className = "user-options-dropdown";

    // Dropdown buttons
    const option1 = document.createElement("button");
    option1.className = "user-options-item danger";
    option1.textContent = "Remove Best Friend";

    option1.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log(`Remove Friend clicked for user ${userId}`);
      dropdown.classList.remove("open");
    });

    const option2 = document.createElement("button");
    option2.className = "user-options-item";
    option2.textContent = "View Profile";

    option2.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log(`View Profile clicked for user ${userId}`);
      dropdown.classList.remove("open");
    });

    dropdown.append(option1, option2);

    // Append
    card.appendChild(btn);
    card.appendChild(dropdown);

    // Toggle dropdown
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".user-options-dropdown.open").forEach(d => {
        if (d !== dropdown) d.classList.remove("open");
      });
      dropdown.classList.toggle("open");
    });

    // Hide on outside click
    document.addEventListener("click", () => {
      dropdown.classList.remove("open");
    });

    list.appendChild(card);
    existingIds.add(String(userId));
    cardElements.push({ userId, card });
  }

  // Update user info (headshots, presence)
  await Promise.all(cardElements.map(async ({ userId, card }) => {
    const headshot = card.querySelector('.thumbnail-2d-container.avatar-card-image img');
    const displayNameLink = card.querySelector('.avatar-name-container a');
    const labels = card.querySelectorAll('.avatar-card-label');
    const avatarStatus = card.querySelector('.avatar-status');

    const usernameLabel = labels[0];
    const gameLabel = labels[1];

    const [userPresence, userRes, userHeadshot] = await Promise.all([
      getUserPresence(userId),
      getUserDetails(userId),
      getUserHeadshot(userId)
    ]);

    headshot.src = userHeadshot?.imageUrl || headshot.src;
    gameLabel.textContent = userPresence?.lastLocation || 'Offline';
    usernameLabel.textContent = '@' + userRes?.name;
    displayNameLink.textContent = userRes?.displayName;

    if (userPresence.userPresenceType === 0) {
      gameLabel.textContent = 'Offline';
    } else if (userPresence.userPresenceType === 1) {
      avatarStatus.innerHTML = `<span data-testid="presence-icon" title="Website" class="online icon-online"></span>`;
      gameLabel.textContent = 'Online';
    } else if (userPresence.userPresenceType === 2) {
      avatarStatus.innerHTML = `<span data-testid="presence-icon" title=${userPresence.lastLocation} class="game icon-game"></span>`;
      gameLabel.innerHTML = `<a href="https://www.roblox.com/games/${userPresence.placeId}" class="avatar-status-link text-link">${userPresence.lastLocation}</a>`;
    } else if (userPresence.userPresenceType === 3) {
      avatarStatus.innerHTML = `<span data-testid="presence-icon" title="Studio" class="studio icon-studio"></span>`;
      gameLabel.textContent = 'Studio';
    }
  }));
}

async function ensureInjected() {
  await injectBestFriendsSection();
  await injectBestFriendCards();
}

const observer = new MutationObserver(() => {
  if (!document.querySelector(".blur-best-friends")) {
    ensureInjected();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial run
ensureInjected();