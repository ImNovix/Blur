import { waitForSelector } from "../helpers/elements.js";
import { getUserDetails, getUserPresence } from "../modules/users.js";
import { getUserHeadshot } from "../modules/thumbnails.js";
import { Storage } from "../helpers/storage.js";
import { makeFriendCardSmall, makeFriendDropdown } from "./cards.js";

// prevent running twice
if (!window.__blurHideFriendsStatusLoaded) {
  window.__blurHideFriendsStatusLoaded = true;

  const storage = new Storage();
  await storage.initDefaults();

  /**
   * Inject global CSS for hiding friend status and custom header
   */
  function injectCSS() {
    if (document.getElementById("blur-hide-friend-status-style")) return;

    const style = document.createElement("style");
    style.id = "blur-hide-friend-status-style";
    style.textContent = `
      /* Hide friend presence icon */
      .blur-hide-friend-status .avatar-status {
        display: none !important;
      }

      /* Hide game name text */
      .blur-hide-friend-status .friends-carousel-tile-experience {
        display: none !important;
      }

      /* Header container */
      .header {
        display: flex;
        align-items: center;
        padding: 10px;
      }

      /* Profile image */
      .header img.profile-image {
          width: 128px;
          height: 128px;
          border-radius: 50%;
          background-color: #484848ff;
      }

      /* Text container */
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

      /* Row for name + premium badge */
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

      /* Best friends dropdown adjustments */
      .friend-tile-dropdown {
        position: absolute;
        z-index: 1002;
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
    const userRes = await getUserDetails();
    const headshotURL = (await getUserHeadshot()).imageUrl;

    const oldSection = await waitForSelector(".section");
    if (!oldSection) return;
    if (document.querySelector(".blur-home-header")) return;

    const newDiv = document.createElement("div");
    newDiv.className = "blur-home-header header";

    const message = "purrr";

    newDiv.innerHTML = `
      <img id="profile-image" class="profile-image" src="${headshotURL}" alt="Profile">
      <div class="header-text" id="header-text">
        <div class="name-row">
          <h1 id="display-name">${userRes.displayName}</h1>
          <img id="premium-badge" class="premium-badge" src="" alt="Premium Badge" style="display: none;">
          <img id="verified-badge" class="verified-badge" src="" alt="Verified Badge" style="display: none;">
        </div>
        <h2 id="username">@${userRes.name}</h2>
        <h3 id="message">${message}</h3>
      </div>
    `;

    oldSection.replaceWith(newDiv);
  }

  /**
   * Inject a separate Best Friends row above the main friends carousel
   */
  async function injectBestFriendsCarousel() {
    const outerContainer = await waitForSelector(".friend-carousel-container");
    if (!outerContainer) return;

    if (document.querySelector(".blur-best-friends-carousel")) return;

    const bestFriends = await storage.get("bestFriends", []);
    if (!bestFriends.length) return;

    // Create Best Friends carousel wrapper
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

    // Insert Best Friends row above main carousel
    outerContainer.parentElement.insertBefore(bestFriendsCarousel, outerContainer);

    // Populate cards
    for (const userId of bestFriends) {
      const cardHTML = await makeFriendCardSmall(userId);
      const wrap = document.createElement("div");
      wrap.innerHTML = cardHTML.trim();
      const card = wrap.firstElementChild;
      if (!card) continue;

      // Hover dropdown
      /*
      card.addEventListener("mouseenter", async () => {
      if (!card.querySelector(".friend-tile-dropdown")) {
        const dropdown = await makeFriendDropdown(userId); // now returns a DOM element
        card.style.position = "relative"; // make the card the positioning context
        card.appendChild(dropdown);

        dropdown.style.display = "block";
        dropdown.style.top = `${card.offsetHeight}px`;
        dropdown.style.left = `0px`;
      }
    });

    card.addEventListener("mouseleave", () => {
      const dropdown = card.querySelector(".friend-tile-dropdown");
      if (dropdown) dropdown.remove();
    });
    */

      listContainer.appendChild(card);
    }
  }

  // Initial runs
  hideFriendsStatus();
  replaceHomeHeader();
  injectBestFriendsCarousel();
}