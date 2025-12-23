import { waitForSelector } from "../helpers/elements.js";
import { getUserDetails, getUserPresence } from "../modules/users.js";
import { getUserHeadshot } from "../modules/thumbnails.js";

// prevent running twice
if (!window.__blurHideFriendsStatusLoaded) {
  window.__blurHideFriendsStatusLoaded = true;

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
        align-items: center; /* vertically centers text with image */
        padding: 10px;
      }

      /* Profile image */
      .header img.profile-image {
          width: 128px;
          height: 128px;
          background-color: #303030;
          border-radius: 50%;
          border: 4px solid transparent;
          border-color: #4f4f4f;
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
          gap: 6px; /* space between name and badge */
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

      /* Premium badge (image) */
      .premium-badge {
          width: 18px;
          height: 18px;
          vertical-align: middle;
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

    const message = "purrr"

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

  // initial runs
  hideFriendsStatus();
  replaceHomeHeader();

  console.log(await getUserPresence())
}