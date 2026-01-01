import { waitForSelector } from "../helpers/elements.js";
import { Storage } from "../helpers/storage.js";
import { makeFriendCardSmall, makeFriendDropdown } from "./cards.js";
import { fetchRoblox } from "../helpers/robloxAPI.js";
import { premiumLogo, verifiedLogo } from "../constaints/logos.js";

// prevent running twice
const storage = new Storage();
await storage.initDefaults();

// pre-fetch so its hopefully ready for when the elements need it
const userRes = await fetchRoblox.getUserDetails();
const authId = String(userRes.id);
const headshotURL = (await fetchRoblox.getUserHeadshot()).imageUrl;

/** Adds a toggle to hide friends' status */
async function hideFriendsStatus() {
  const header = await waitForSelector(".container-header.people-list-header");
  const h2 = header?.querySelector("h2");
  const count = h2?.querySelector(".friends-count");
  if (!h2 || !count) return;
  if (h2.querySelector(".status-toggle")) return;

  // 🔑 read setting (global key)
  const isHidden = await storage.get("hideFriendStatus", false);

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
  checkbox.checked = isHidden;

  const labelText = document.createElement("span");
  labelText.textContent = "Hide friends status?";

  wrapper.appendChild(checkbox);
  wrapper.appendChild(labelText);
  count.insertAdjacentElement("afterend", wrapper);

  // apply immediately
  if (isHidden) {
    document.body.classList.add("blur-hide-friend-status");
  }

  checkbox.addEventListener("change", async () => {
    const value = checkbox.checked;
    document.body.classList.toggle("blur-hide-friend-status", value);
    await storage.set("hideFriendStatus", value); // global key, NO authId
  });
}

async function injectHomeHeader() {
  const oldSection = await waitForSelector(".section");
  if (!oldSection) return;
  if (document.querySelector(".blur-home-header")) return;

  let template = await storage.get("homeGreeting", "{greeting}, {displayName}!");
  if (typeof template !== "string") template = "{greeting}, {displayName}!";

  const date = new Date();
  const { displayName: displayNameValue, userName: userNameValue } = userRes;

  // Determine time-based greeting
  let greeting;
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) greeting = "Morning";
  else if (hour >= 12 && hour < 17) greeting = "Afternoon";
  else if (hour >= 17 && hour < 21) greeting = "Evening";
  else greeting = "Night";

  let greetingText = template.replaceAll("{greeting}", greeting);

  // -------------------------
  // Special date messages & user's birthday
  // -------------------------
  const month = date.getMonth() + 1; // January = 0
  const day = date.getDate();

  let isSpecialMessage = false;
  let messages = [];

  // Holiday messages
  const holidayMessages = {
    "1-1": "🎉 New year, new me! Happy New Year!",
    "2-14": "💘 Love is in the air! Happy Valentine's Day!",
    "10-31": "🎃 Boo! Happy Halloween!",
    "12-25": "🎄 Merry Christmas!"
  };

  const key = `${month}-${day}`;
  const holidayMessage = holidayMessages[key];
  if (holidayMessage) {
    messages.push(holidayMessage);
    isSpecialMessage = true;
  }

  // User birthday
  if (await storage.get('celebrateUsersBirthday', false)) {
    try {
      const res = await fetchRoblox.getUserBirthday();
      if (res && month === res.birthMonth && day === res.birthDay) {
        messages.push("Happy Birthday");
        isSpecialMessage = true;
      }
    } catch (err) {
      console.error("Failed to fetch user birthday:", err);
    }
  }

  // Combine messages with proper grammar
  if (messages.length > 0) {
    if (messages.length === 1) greetingText = messages[0] + "!";
    else if (messages.length === 2) greetingText = `${messages[0]} and ${messages[1]}!`;
    else greetingText = messages.slice(0, -1).join(", ") + `, and ${messages[messages.length - 1]}!`;
  } else {
    // Apply {displayName} / {username} replacements if not a special message
    const hasDisplay = greetingText.includes("{displayName}");
    const hasUsername = greetingText.includes("{username}");
    if (hasDisplay && hasUsername) greetingText = greetingText.replaceAll("{username}", "");
    if (hasDisplay) greetingText = greetingText.replaceAll("{displayName}", displayNameValue);
    if (!hasDisplay && hasUsername) greetingText = greetingText.replaceAll("{username}", userNameValue);

    greetingText = greetingText
      .replace(/\s+,/g, ",")
      .replace(/,\s+/g, ", ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  // -------------------------
  // Render header
  // -------------------------
  const newDiv = document.createElement("div");
  newDiv.className = "blur-home-header header";
  newDiv.innerHTML = `
    <img class="profile-image" src="" alt="Profile">
    <div class="header-text">
      <div class="name-row">
        <h1 id="greeting"></h1>
        <img class="verified-badge" src="${verifiedLogo}" style="display:none;">
        <img class="premium-badge" src="${premiumLogo}" style="display:none;">
      </div>
      <h2 id="username">@</h2>
      <h3 id="message">purrr</h3>
    </div>
  `;

  oldSection.replaceWith(newDiv);

  newDiv.querySelector(".profile-image").src = headshotURL;
  newDiv.querySelector("#greeting").textContent = greetingText;
  newDiv.querySelector("#username").textContent = "@" + userRes.name;

  const isVerified = userRes.hasVerifiedBadge;
  const hasPremium = await fetchRoblox.getUserPremium();

  if (isVerified) newDiv.querySelector(".verified-badge").style.display = "inline";
  else if (hasPremium) newDiv.querySelector(".premium-badge").style.display = "inline";
}

async function injectBestFriendsCarousel() {
  const outerContainer = await waitForSelector(".friend-carousel-container");
  if (!outerContainer) return;

  const bestFriends = await storage.get('bestFriends', [], authId);
  if (!bestFriends.length) return;

  const homeContainer = document.querySelector("#HomeContainer");
  if (!homeContainer) return;
  if (document.querySelector(".blur-best-friends-carousel")) return;

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

  const cardElements = bestFriends.map(userId => {
    const placeholder = document.createElement("div");
    placeholder.className = "friends-carousel-tile placeholder";
    listContainer.appendChild(placeholder);
    return { userId, placeholder };
  });

  for (const { userId, placeholder } of cardElements) {
    (async () => {
      const cardHTML = await makeFriendCardSmall(userId);
      if (!cardHTML) return;

      const template = document.createElement("template");
      template.innerHTML = cardHTML.trim();
      const card = template.content.firstElementChild;
      if (!card) return;

      listContainer.replaceChild(card, placeholder);
      if (window.getComputedStyle(card).position === "static") card.style.position = "relative";

      const dropdown = document.createElement("div");
      dropdown.className = "friend-tile-dropdown";
      dropdown.style.position = "absolute";
      dropdown.style.display = "none";
      dropdown.style.zIndex = "1002";

      const userPresence = await fetchRoblox.getUserPresence(userId);
      dropdown.style.width = userPresence.userPresenceType === 2 ? "320px" : "240px";

      document.body.appendChild(dropdown);

      let populated = false;

      function positionDropdown() {
        const cardRect = card.getBoundingClientRect();
        const containerRect = homeContainer.getBoundingClientRect();
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const scrollX = window.scrollX || document.documentElement.scrollLeft;

        let left = cardRect.left + scrollX + cardRect.width / 2 - dropdown.offsetWidth / 2;
        const containerLeft = containerRect.left + scrollX;
        const containerRight = containerRect.right + scrollX;

        left = Math.max(left, containerLeft);
        left = Math.min(left, containerRight - dropdown.offsetWidth);

        dropdown.style.top = cardRect.bottom + scrollY + "px";
        dropdown.style.left = left + "px";
      }

      card.addEventListener("mouseleave", e => {
        if (e.relatedTarget && dropdown.contains(e.relatedTarget)) return;
        dropdown.style.display = "none";
      });

      card.addEventListener("mouseenter", async () => {
        if (!populated) {
          const dropdownHTML = await makeFriendDropdown(userId);
          if (!dropdownHTML) return;

          dropdown.innerHTML = dropdownHTML;
          populated = true;

          // Attach click handlers
          const buttons = dropdown.querySelectorAll('button.friend-tile-dropdown-button');
          buttons.forEach(btn => {
            if (btn.textContent.includes("View Profile")) {
              btn.addEventListener("click", () => { window.open(`https://www.roblox.com/users/${userId}/profile`, "_blank"); });
            }
          });

          const joinBtn = dropdown.querySelector(".btn-growth-sm");
          if (joinBtn) {
            joinBtn.addEventListener("click", () => { window.open(`roblox://userId=${userId}`) });
          }
        }
        dropdown.style.display = "block";
        positionDropdown();
      });

      dropdown.addEventListener("mouseleave", e => {
        if (e.relatedTarget && card.contains(e.relatedTarget)) return;
        dropdown.style.display = "none";
      });

      window.addEventListener("scroll", () => {
        if (dropdown.style.display === "block") positionDropdown();
      });

      window.addEventListener("resize", () => {
        if (dropdown.style.display === "block") positionDropdown();
      });
    })();
  }
}

async function removeConnectButton() {
  const shouldRemove = await storage.get("removeConnectButton", true);
  if (!shouldRemove) return;

  const observer = new MutationObserver(() => {
    document.querySelectorAll(".friends-carousel-tile").forEach(tile => {
      const nameSpan = tile.querySelector(".friends-carousel-display-name");
      if (nameSpan?.textContent.trim() === "Connect") tile.remove();
    });
  });

  const container = document.querySelector("#HomeContainer");
  if (!container) return;

  observer.observe(container, { childList: true, subtree: true });

  const existingTile = container.querySelector(
    ".friends-carousel-tile .friends-carousel-display-name"
  );
  if (existingTile?.textContent.trim() === "Connect") {
    existingTile.closest(".friends-carousel-tile").remove();
  }
}

async function renameFriendsRow() {
  const value = await storage.get("renameConnectionsToFriends", true);
  if (!value) return;

  await waitForSelector(".container-header.people-list-header");

  const header = document.querySelector(
    "#HomeContainer > div.place-list-container > div > div > div.friend-carousel-container > div > div.container-header.people-list-header > h2"
  );
  if (!header) return;

  let textNode = Array.from(header.childNodes).find(
    node => node.nodeType === Node.TEXT_NODE
  );

  if (!textNode) {
    textNode = document.createTextNode("Friends");
    header.prepend(textNode);
  } else {
    textNode.nodeValue = "Friends";
  }
}

// Initial runs
hideFriendsStatus();
injectHomeHeader();
injectBestFriendsCarousel();
removeConnectButton();
renameFriendsRow();