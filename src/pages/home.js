import { waitForSelector } from "../helpers/elements.js";
import { getUserDetails, getUserPresence } from "../modules/users.js";
import { getUserHeadshot } from "../modules/thumbnails.js";
import { Storage } from "../helpers/storage.js";
import { makeFriendCardSmall, makeFriendDropdown } from "./cards.js";

// prevent running twice
const storage = new Storage();
await storage.initDefaults();

// pre-fetch so its hopefully ready for when the elements need it
const userRes = await getUserDetails();
const headshotURL = (await getUserHeadshot()).imageUrl;

/**
 * Inject global CSS
 * - Your original home header + hide friends status CSS
 * - Minimal dropdown z-index CSS
 */
function injectCSS() {
  if (document.getElementById("blur-home-style")) return;

  const style = document.createElement("style");
  style.id = "blur-home-style";
  style.textContent = `
    /* ---------------------------
       Your original home header CSS
    --------------------------- */
    .blur-hide-friend-status .avatar-status {
      display: none !important;
    }

    .blur-hide-friend-status .friends-carousel-tile-experience {
      display: none !important;
    }

    .header {
      display: flex;
      align-items: center;
      padding: 10px;
    }

    .header img.profile-image {
      width: 128px;
      height: 128px;
      border-radius: 50%;
      background-color: #f7f7f8;
    }

    .header-text {
      display: flex;
      flex-direction: column;
      margin-left: 20px;
    }

    .header-text h1,
    .header-text h2,
    .header-text h3 {
      line-height: 1.15;
    }

    .name-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header-text h1 {
      font-size: 22px;
      color: white;
    }

    .header-text h2 {
      font-size: 16px;
      color: #bfbfbf;
    }

    .header-text h3 {
      font-size: 16px;
      color: #c8c8c8;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Adds a toggle to hide friends' status
 */
async function hideFriendsStatus() {
  injectCSS();

  const header = await waitForSelector(".container-header.people-list-header");
  const h2 = header?.querySelector("h2");
  const count = h2?.querySelector(".friends-count");
  if (!h2 || !count) return;

  if (h2.querySelector(".status-toggle")) return;

  const wrapper = document.createElement("label");
  wrapper.className = "status-toggle";
  wrapper.style.cssText = `
    margin-left: 20px;
    cursor: pointer;
    font-size: 13px;
    user-select: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  `;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";

  const labelText = document.createElement("span");
  labelText.textContent = "Hide friends status?";

  wrapper.appendChild(checkbox);
  wrapper.appendChild(labelText);
  count.insertAdjacentElement("afterend", wrapper);

  checkbox.addEventListener("change", () => {
    document.body.classList.toggle("blur-hide-friend-status", checkbox.checked);
  });
}

/**
 * Replace the home header with a custom div
 */
async function replaceHomeHeader() {
  const oldSection = await waitForSelector(".section");
  if (!oldSection) return;
  if (document.querySelector(".blur-home-header")) return;

  const newDiv = document.createElement("div");
  newDiv.className = "blur-home-header header";

  const message = "purrr";

  newDiv.innerHTML = `
    <img class="profile-image" src="" alt="Profile">
    <div class="header-text">
      <div class="name-row">
        <h1 id="display-name"></h1>
        <img class="premium-badge" style="display:none;">
        <img class="verified-badge" style="display:none;">
      </div>
      <h2 id="username">@</h2>
      <h3>${message}</h3>
    </div>
  `;

  oldSection.replaceWith(newDiv);
  loadHomeHeaderElements();
}

function loadHomeHeaderElements() {
  const header = document.querySelector(".blur-home-header");
  if (!header) return;

  header.querySelector(".profile-image").src = headshotURL;
  header.querySelector("#display-name").textContent = userRes.displayName;
  header.querySelector("#username").textContent = "@" + userRes.name;
}

/**
 * Inject Best Friends row above main friends carousel
 */
async function injectBestFriendsCarousel() {
  const outerContainer = await waitForSelector(".friend-carousel-container");
  if (!outerContainer) return;

  if (document.querySelector(".blur-best-friends-carousel")) return;

  const bestFriends = await storage.get("bestFriends", []);
  if (!bestFriends.length) return;

  const bestFriendsCarousel = document.createElement("div");
  bestFriendsCarousel.className = "blur-best-friends-carousel";

  const headerDiv = document.createElement("div");
  headerDiv.className = "container-header";
  headerDiv.innerHTML = `<h2>Best Friends (${bestFriends.length})</h2>`;
  bestFriendsCarousel.appendChild(headerDiv);

  const scrollContainer = document.createElement("div");
  scrollContainer.className = "friends-carousel-container";

  const listContainer = document.createElement("div");
  listContainer.className = "friends-carousel-list-container-not-full";

  scrollContainer.appendChild(listContainer);
  bestFriendsCarousel.appendChild(scrollContainer);

  outerContainer.parentElement.insertBefore(bestFriendsCarousel, outerContainer);

  for (const userId of bestFriends) {
    const cardHTML = await makeFriendCardSmall(userId);

    const template = document.createElement("template");
    template.innerHTML = cardHTML.trim();
    const card = template.content.firstElementChild;
    if (!card) continue;

    if (window.getComputedStyle(card).position === "static") {
      card.style.position = "relative";
    }

    let closeTimer = null;

    card.addEventListener("mouseenter", async () => {
      const existing = card.querySelector(".friend-tile-dropdown");
      if (existing) {
        if (closeTimer) clearTimeout(closeTimer);
        closeTimer = null;
        return;
      }

      const dropdownHTML = await makeFriendDropdown(userId);
      if (!dropdownHTML) return;

      const dropdown = document.createElement("div");
      dropdown.className = "friend-tile-dropdown";
      dropdown.innerHTML = dropdownHTML;

      dropdown.style.position = "absolute";
      dropdown.style.top = `${card.offsetHeight}px`;
      dropdown.style.left = "0";
      dropdown.style.zIndex = "2147483647";

      card.appendChild(dropdown);

      dropdown.addEventListener("mouseenter", () => {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
      });

      dropdown.addEventListener("mouseleave", (e) => {
        const to = e.relatedTarget;
        if (to && card.contains(to)) return;
        closeTimer = setTimeout(() => {
          const d = card.querySelector(".friend-tile-dropdown");
          if (d) d.remove();
          closeTimer = null;
        }, 120);
      });
    });

    card.addEventListener("mouseleave", (e) => {
      const dropdown = card.querySelector(".friend-tile-dropdown");
      if (!dropdown) return;
      const to = e.relatedTarget;
      if (to && dropdown.contains(to)) return;
      closeTimer = setTimeout(() => {
        const d = card.querySelector(".friend-tile-dropdown");
        if (d) d.remove();
        closeTimer = null;
      }, 120);
    });

    listContainer.appendChild(card);
  }
}


// Initial runs
hideFriendsStatus();
replaceHomeHeader();
injectBestFriendsCarousel();