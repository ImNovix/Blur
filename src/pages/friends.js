import { waitForSelector } from "../helpers/elements.js";
import { makeFriendCardHTML } from "../helpers/cards.js";
import { Storage } from "../helpers/storage.js";
import { fetchRoblox } from "../helpers/robloxAPI.js";

console.log("[pages/friends.js] Loaded");

const extensionURL = chrome.runtime.getURL("");
const storage = new Storage();
await storage.initDefaults();

// Get authId for per-user storage
const authId = String((await fetchRoblox.getUserDetails())?.id);

/* ----------------------------------------
 * Helpers
 * -------------------------------------- */

function getActiveFriendsTab() {
  const hash = location.hash.toLowerCase();
  if (hash.includes("friends")) return "friends";
  if (hash.includes("following")) return "following";
  if (hash.includes("followers")) return "followers";
  return null;
}

function getRobloxFriendCards() {
  return Array.from(document.querySelectorAll("#friends-web-app ul > li[id]"))
    .filter(li =>
      li.querySelector(".avatar-card") ||
      li.querySelector(".thumbnail-2d-container")
    );
}

/* ----------------------------------------
 * Best Friends Section
 * -------------------------------------- */

let injecting = false;

async function injectBestFriendsSection() {
  if (getActiveFriendsTab() !== "friends") return;
  if (injecting) return;
  injecting = true;

  const connectionsSection = await waitForSelector(".friends-content.section");
  if (!connectionsSection || document.querySelector(".blur-best-friends")) {
    injecting = false;
    return;
  }

  const bestFriends = await storage.get('bestFriends', [], authId);

  const section = document.createElement("div");
  section.className = "friends-content section blur-best-friends";
  section.innerHTML = `
    <div class="container-header">
      <h2 class="friends-subtitle">
        Best Friends (${bestFriends.length})
      </h2>
    </div>
    <ul class="hlist avatar-cards blur-best-friends-cards"></ul>
  `;

  connectionsSection.parentNode.insertBefore(section, connectionsSection);
  injecting = false;
}

/* ----------------------------------------
 * Best Friend Cards (Custom)
 * -------------------------------------- */

async function injectBestFriendCards() {
  const list = document.querySelector(".blur-best-friends-cards");
  if (!list) return;

  const bestFriends = await storage.get('bestFriends', [], authId);
  const existing = new Set([...list.children].map(c => c.id));
  const cardsToPopulate = [];

  for (const userId of bestFriends) {
    const id = String(userId);
    if (existing.has(id)) continue;

    const html = await makeFriendCardHTML(userId);
    const wrap = document.createElement("div");
    wrap.innerHTML = html.trim();

    const card = wrap.firstElementChild;
    if (!card) continue;

    card.id = id;
    card.style.position = "relative";

    injectOptionsMenu(card, userId);
    list.appendChild(card);
    existing.add(id);
    cardsToPopulate.push({ card, userId });
  }

  if (cardsToPopulate.length) {
    await populateUserData(cardsToPopulate);
  }
}

/* ----------------------------------------
 * Roblox Native Card Injection
 * -------------------------------------- */

async function injectIntoRobloxCards() {
  for (const card of getRobloxFriendCards()) {
    if (card.querySelector(".blur-user-options")) continue;
    injectOptionsMenu(card, Number(card.id));
  }
}

/* ----------------------------------------
 * Shared Options Menu
 * -------------------------------------- */

function injectOptionsMenu(card, userId) {
  if (card.querySelector(".blur-user-options")) return;
  card.style.position ||= "relative";

  const btn = document.createElement("button");
  btn.className = "user-options-btn blur-user-options";

  const img = document.createElement("img");
  img.src = extensionURL + "src/images/more.png";
  img.alt = "Options";
  btn.appendChild(img);

  const dropdown = document.createElement("div");
  dropdown.className = "user-options-dropdown";

  async function refreshToggle() {
    // Remove old button
    const oldBtn = dropdown.querySelector(".user-options-toggle");
    if (oldBtn) oldBtn.remove();

    const isBestFriend =
      authId &&
      (await storage.containsInArray("bestFriends", userId, authId));

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "user-options-item user-options-toggle";
    toggleBtn.textContent = isBestFriend
      ? "Remove Best Friend"
      : "Add to Best Friends";

    toggleBtn.addEventListener("click", async e => {
      e.stopPropagation();
      if (!authId) return;

      if (isBestFriend) {
        await storage.removeFromArray("bestFriends", userId, authId);
      } else {
        await storage.addToArray("bestFriends", userId, authId);
      }

      // Refresh the UI
      await injectBestFriendsSection();
      await injectBestFriendCards();
      await refreshToggle();
    });

    dropdown.prepend(toggleBtn);
  }

  refreshToggle(); // initial

  const profileBtn = document.createElement("button");
  profileBtn.className = "user-options-item";
  profileBtn.textContent = "View Profile";
  profileBtn.addEventListener("click", e => {
    e.stopPropagation();
    window.open(`https://www.roblox.com/users/${userId}/profile`, "_blank");
    dropdown.classList.remove("open");
  });

  dropdown.appendChild(profileBtn);

  btn.addEventListener("click", e => {
    e.stopPropagation();
    document
      .querySelectorAll(".user-options-dropdown.open")
      .forEach(d => d !== dropdown && d.classList.remove("open"));
    dropdown.classList.toggle("open");
  });

  document.addEventListener("click", () => dropdown.classList.remove("open"));

  card.append(btn, dropdown);
}

/* ----------------------------------------
 * Populate Card Data
 * -------------------------------------- */

async function populateUserData(cards) {
  await Promise.all(
    cards.map(async ({ card, userId }) => {
      const headshot =
        card.querySelector(".thumbnail-2d-container.avatar-card-image img");
      const displayNameLink =
        card.querySelector(".avatar-name-container a");
      const labels = card.querySelectorAll(".avatar-card-label");
      const avatarStatus = card.querySelector(".avatar-status");

      const usernameLabel = labels[0];
      const gameLabel = labels[1];

      const [presence, user, thumb] = await Promise.all([
        fetchRoblox.getUserPresence(userId),
        fetchRoblox.getUserDetails(userId),
        fetchRoblox.getUserHeadshot(userId)
      ]);

      if (thumb?.imageUrl) headshot.src = thumb.imageUrl;
      usernameLabel.textContent = "@" + user?.name;
      displayNameLink.textContent = user?.displayName;

      if (presence.userPresenceType === 0) {
        gameLabel.textContent = "Offline";
      } else if (presence.userPresenceType === 1) {
        avatarStatus.innerHTML = `<span class="online icon-online"></span>`;
        gameLabel.textContent = "Online";
      } else if (presence.userPresenceType === 2) {
        avatarStatus.innerHTML = `<span class="game icon-game"></span>`;
        gameLabel.innerHTML = `
          <a class="avatar-status-link text-link"
             href="https://www.roblox.com/games/${presence.placeId}">
            ${presence.lastLocation}
          </a>
        `;
      } else {
        avatarStatus.innerHTML = `<span class="studio icon-studio"></span>`;
        gameLabel.textContent = "Studio";
      }
    })
  );
}

/* ----------------------------------------
 * Observers
 * -------------------------------------- */

async function ensureInjected() {
  await injectBestFriendsSection();
  await injectBestFriendCards();
  await injectIntoRobloxCards();
}

const body = await waitForSelector("body");
const observer = new MutationObserver(ensureInjected);
observer.observe(body, { childList: true, subtree: true });

// Initial run
ensureInjected();