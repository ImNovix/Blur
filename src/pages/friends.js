import { waitForSelector } from "../helpers/elements.js";
import { makeFriendCardHTML } from "./cards.js";
import { getUserPresence, getUserDetails } from "../modules/users.js";
import { getUserHeadshot } from "../modules/thumbnails.js";
import { bestFriends } from "../../local/vars.js"

console.log("[pages/friends.js] Loaded");

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
    list.appendChild(card);
    existingIds.add(String(userId));
    cardElements.push({ userId, card });
  }

  await Promise.all(cardElements.map(async ({ userId, card }) => {
    const headshot = card.querySelector('.thumbnail-2d-container.avatar-card-image img');
    const displayNameLink = card.querySelector('.avatar-name-container a');
    const labels = card.querySelectorAll('.avatar-card-label');
    const avatarStatus = card.querySelector('.avatar-status');

    const usernameLabel = labels[0];
    const gameLabel = labels[1];

    // Fetch user data
    const [userPresence, userRes, userHeadshot] = await Promise.all([
      getUserPresence(userId),
      getUserDetails(userId),
      getUserHeadshot(userId)
    ]);

    // Update DOM
    headshot.src = userHeadshot?.imageUrl || headshot.src;
    gameLabel.textContent = userPresence?.lastLocation || 'Offline';
    usernameLabel.textContent = '@' + userRes?.name;
    displayNameLink.textContent = userRes?.displayName;

    if (userPresence.userPresenceType === 0) {
      // offline
      gameLabel.textContent = 'Offline';
    } else if (userPresence.userPresenceType === 1) {
      // online
      avatarStatus.innerHTML = `<span data-testid="presence-icon" title="Website" class="online icon-online"></span>`;
      gameLabel.textContent = 'Online';
    } else if (userPresence.userPresenceType === 2) {
      // ingame
      avatarStatus.innerHTML = `<span data-testid="presence-icon" title=${userPresence.lastLocation} class="game icon-game"></span>`
      gameLabel.innerHTML = `<a href="https://www.roblox.com/games/${userPresence.placeId}" class="avatar-status-link text-link">${userPresence.lastLocation}</a>`;
    } else if (userPresence.userPresenceType === 3) {
      // studio
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
  // Re-inject ONLY if section is gone
  if (!document.querySelector(".blur-best-friends")) {
    ensureInjected();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial run
ensureInjected();