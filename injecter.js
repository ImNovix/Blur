// [1] GLOBAL SHARED MODULES (Classes, Utils)
class fetchRoblox {
  // Account Details
  static async getAuth() {
    return await fetchRobloxAPI("https://users.roblox.com/v1/users/authenticated");
  }
  static async getUserBirthday() {
    return await fetchRobloxAPI(`https://users.roblox.com/v1/birthdate`);
  }

  // Friends
  static async getFriendCount(userID = "0") {
    if (userID === "0") {
      return await fetchRobloxAPI(`https://friends.roblox.com/v1/my/friends/count`);
    } else {
      return await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${userID}/friends/count`);
    }
  }
  static async getFriends(userID = "0") {
    if (userID === "0") {
      userID = (await fetchRoblox.getAuth()).id;
    }
    return await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${userID}/friends`);
  }
  static async getSuggestedFriends() {
    const authID = (await fetchRoblox.getAuth()).id;
    return await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${authID}/friends/recommendations?source=AddFriendsPage`);
  }
  static async getMutualFriends(userID) {
    try {
      const [friendsARes, friendsBRes] = await Promise.all([fetchRoblox.getFriends(),
      // current user's friends
      fetchRoblox.getFriends(userID) // target user's friends
      ]);

      // Extract arrays safely
      const friendsA = Array.isArray(friendsARes.data) ? friendsARes.data : [];
      const friendsB = Array.isArray(friendsBRes.data) ? friendsBRes.data : [];

      // Compute mutuals
      const friendIdsB = new Set(friendsB.map(f => f.id));
      const mutual = friendsA.filter(f => friendIdsB.has(f.id));
      return {
        mutualFriends: mutual,
        count: mutual.length
      };
    } catch (err) {
      console.error("Error fetching mutual friends:", err);
      return {
        mutualFriends: [],
        count: 0,
        error: err.message
      };
    }
  }
  static async getFriendship(userID) {
    const authID = (await fetchRoblox.getAuth()).id;
    const res = await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${authID}/friends/statuses?userIds=${userID}`);
    return res.data[0];
  }
  static async getFriendshipDuration(userID) {
    const url = "https://apis.roblox.com/profile-insights-api/v1/multiProfileInsights";
    const body = {
      rankingStrategy: "tc_info_boost",
      userIds: [userID]
    };
    try {
      const res = await fetchRobloxAPI(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const insights = res.userInsights?.[0]?.profileInsights || [];

      // Find the friendship date insight
      const friendshipInsight = insights.find(i => i.friendshipAgeInsight);
      if (!friendshipInsight) return "Unknown";
      const {
        seconds,
        nanos
      } = friendshipInsight.friendshipAgeInsight.friendsSinceDateTime;
      const friendsSince = new Date(seconds * 1000 + nanos / 1e6);

      // Format with full month name + ordinal + year
      const formatted = formatFriendsSince(friendsSince);
      return formatted;
    } catch (err) {
      console.error("Failed to fetch friendship duration:", err);
      return "Unknown";
    }
  }
  static async acceptFriendRequest(userID) {
    return await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${userID}/accept-friend-request`, {
      method: "POST"
    });
  }
  static async declineFriendRequest(userID) {
    return await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${userID}/decline-friend-request`, {
      method: "POST"
    });
  }
  static async getFriendRequests() {
    return await fetchRobloxAPI(`https://friends.roblox.com/v1/my/friends/requests`);
  }

  // Users
  static async getUserDetails(userID = "0") {
    if (userID === "0") {
      userID = (await fetchRoblox.getAuth()).id;
    }
    return await fetchRobloxAPI(`https://users.roblox.com/v1/users/${userID}`);
  }
  static async getUserPresence(userID = "0") {
    if (userID === "0") {
      userID = (await fetchRoblox.getAuth()).id;
    }
    return (await fetchRobloxAPI(`https://presence.roblox.com/v1/presence/users`, {
      method: "POST",
      body: JSON.stringify({
        "userIds": [userID]
      })
    })).userPresences[0];
  }
  static async getUserPremium(userID = "0") {
    if (userID === "0") {
      userID = (await fetchRoblox.getAuth()).id;
    }
    return await fetchRobloxAPI(`https://premiumfeatures.roblox.com/v1/users/${userID}/validate-membership`);
  }

  // Thumbnails
  static async getUserHeadshot(userID = "0", size = "150x150", format = "Png", isCircular = "false") {
    if (userID === "0") {
      userID = (await fetchRoblox.getAuth()).id;
      const res = await fetchRobloxAPI(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userID}&size=${size}&format=${format}&isCircular=${isCircular}`);
      return res.data[0];
    } else {
      const res = await fetchRobloxAPI(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userID}&size=${size}&format=${format}&isCircular=${isCircular}`);
      return res.data[0];
    }
  }
  static async getUniverseIcon(universeID, size = "150x150", format = "Png", isCircular = "false") {
    return (await fetchRobloxAPI(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeID}&size=${size}&format=${format}&isCircular=${isCircular}`)).data[0];
  }
}
async function fetchRobloxAPI(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isPost = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  let headers = {
    ...(options.headers || {})
  };
  let attempt = 0;

  // If it's a POST/PUT/PATCH/DELETE, pre-include the CSRF token from options or empty string
  if (isPost && !headers['X-CSRF-TOKEN']) {
    headers['X-CSRF-TOKEN'] = ''; // Roblox will return a new token if empty/invalid
    headers['Content-Type'] = 'application/json';
  }
  while (attempt < 2) {
    const response = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: 'include'
    });

    // Roblox returns 403 with x-csrf-token header if CSRF token is missing or invalid
    if (response.status === 403 && isPost) {
      const csrfToken = response.headers.get('x-csrf-token');
      if (csrfToken && attempt === 0) {
        headers['X-CSRF-TOKEN'] = csrfToken; // Retry with valid token
        attempt++;
        continue;
      }
    }
    if (!response.ok) {
      throw new Error(`API call to ${url} failed with status: ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    } else {
      return response.text();
    }
  }
  throw new Error("Failed to fetch with valid CSRF token");
}
function formatFriendsSince(date) {
  if (!(date instanceof Date)) return date;
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.toLocaleString(undefined, {
    month: "long"
  });
  const getOrdinal = n => {
    if (n >= 11 && n <= 13) return "th";
    switch (n % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };
  return `${month} ${day}${getOrdinal(day)}, ${year}`;
}

class Storage {
  static isContextAlive() {
    try {
      return !!chrome?.runtime?.id;
    } catch {
      return false;
    }
  }
  constructor(area = chrome.storage.local) {
    this.area = area;
    this.DEFAULTS = {
      showUnreleasedVersionNotice: true,
      hideFriendStatus: false,
      removeConnectButton: true,
      renameConnectionsToFriends: true,
      celerbateUsersBirthday: true,
      homeGreeting: "{greeting}, {displayName}!"
    };
    this.PER_USER_KEYS = ["bestFriends"];
  }
  isPerUserKey(key) {
    return this.PER_USER_KEYS.includes(key);
  }
  initDefaults() {
    return new Promise(resolve => {
      if (!Storage.isContextAlive()) return resolve();
      this.area.get(null, current => {
        if (!Storage.isContextAlive()) return resolve();
        try {
          const toSet = {};
          for (const key in this.DEFAULTS) {
            const def = this.DEFAULTS[key];
            const cur = current[key];
            const isMissing = !(key in current);
            const isBroken = cur === null || cur === undefined || Array.isArray(def) && !Array.isArray(cur) || typeof def === "object" && !Array.isArray(def) && typeof cur !== "object";
            if (isMissing || isBroken) {
              toSet[key] = structuredClone(def);
            }
          }
          Object.keys(toSet).length ? this.area.set(toSet, resolve) : resolve();
        } catch {
          resolve();
        }
      });
    });
  }
  get(key, fallback, authID) {
    return new Promise(resolve => {
      if (!Storage.isContextAlive()) {
        resolve(fallback ?? this.DEFAULTS[key]);
        return;
      }
      this.area.get(null, result => {
        if (!Storage.isContextAlive()) {
          resolve(fallback ?? this.DEFAULTS[key]);
          return;
        }
        try {
          let value;
          if (authID && this.isPerUserKey(key)) {
            const userObj = result[authID] || {};
            value = userObj[key];
            if (value === undefined) value = fallback ?? [];
            if (Array.isArray(fallback) && !Array.isArray(value)) value = [];
          } else {
            value = result[key] ?? fallback ?? this.DEFAULTS[key];
          }
          resolve(value);
        } catch {
          resolve(fallback ?? this.DEFAULTS[key]);
        }
      });
    });
  }
  set(key, value, authID) {
    return new Promise(resolve => {
      if (!Storage.isContextAlive()) return resolve();
      this.area.get(null, result => {
        if (!Storage.isContextAlive()) return resolve();
        try {
          if (authID && this.isPerUserKey(key)) {
            const userObj = result[authID] || {};
            userObj[key] = Array.isArray(value) ? value : [];
            this.area.set({
              [authID]: userObj
            }, resolve);
          } else {
            this.area.set({
              [key]: value
            }, resolve);
          }
        } catch {
          resolve();
        }
      });
    });
  }
  async addToArray(key, item, authID) {
    if (!authID) return [];
    const arr = await this.get(key, [], authID);
    if (!Array.isArray(arr)) return [];
    if (!arr.includes(item)) {
      arr.push(item);
      await this.set(key, arr, authID);
    }
    return arr;
  }
  async removeFromArray(key, item, authID) {
    if (!authID) return [];
    const arr = await this.get(key, [], authID);
    if (!Array.isArray(arr)) return [];
    const filtered = arr.filter(i => i !== item);
    await this.set(key, filtered, authID);
    return filtered;
  }
  async containsInArray(key, item, authID) {
    if (!authID) return false;
    const arr = await this.get(key, [], authID);
    if (!Array.isArray(arr)) return false;
    return arr.includes(item);
  }
  getAll() {
    return new Promise(resolve => {
      if (!Storage.isContextAlive()) return resolve({});
      this.area.get(null, result => resolve(result ?? {}));
    });
  }
  resetAll() {
    return new Promise(resolve => {
      if (!Storage.isContextAlive()) return resolve();
      this.area.clear(() => this.initDefaults().then(resolve));
    });
  }
}

function waitForSelector(selector, timeout = 10000) {
  return new Promise(resolve => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    if (timeout) {
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    }
  });
}

function truncateString(str, maxLength) {
  if (str.length > maxLength) {
    return str.slice(0, maxLength - 3) + '...';
  }
  return str;
}
async function makeFriendCardHTML(userID) {
  return `
        <li id="${userID}" class="list-item avatar-card">
            <div class="avatar-card-container">
                <div class="avatar-card-content">
                    <div class="avatar avatar-card-fullbody" data-testid="avatar-card-container">
                        <a href="/users/${userID}/profile" class="avatar-card-link" data-testid="avatar-card-link">
                            <span class="thumbnail-2d-container avatar-card-image ">
                                <img class="" src="" alt="" title="">
                            </span>
                        </a>
                        <div class="avatar-status"></div>
                    </div>
                    <div class="avatar-card-caption">
                        <span>
                            <div class="avatar-name-container">
                                <a href="/users/${userID}/profile" class="text-overflow avatar-name"></a>
                            </div>
                            <div class="avatar-card-label"></div>
                            <div class="avatar-card-label"></div>
                        </span>
                    </div>
                </div>
            </div>
        </li>
    `;
}
async function makeFriendCardSmall(userID) {
  const userPresence = await fetchRoblox.getUserPresence(userID);
  const userRes = await fetchRoblox.getUserDetails(userID);
  const userheadshotURL = (await fetchRoblox.getUserHeadshot(userID)).imageUrl;
  let avatarStatus;
  let gameStatus;
  if (userPresence.userPresenceType === 0) {
    // Offline
    avatarStatus = `<div class="avatar-status"></div>`;
    gameStatus = `<div class="friends-carousel-tile-sublabel"></div>`;
  } else if (userPresence.userPresenceType === 1) {
    // Website
    avatarStatus = `
            <div class="avatar-status">
                <span data-testid="presence-icon" title="Website" class="online icon-online"></span>
            </div>
        `;
    gameStatus = `<div class="friends-carousel-tile-sublabel"></div>`;
  } else if (userPresence.userPresenceType === 2) {
    // In-Game
    const gameTitle = userPresence.lastLocation;
    const shoternGameTitle = truncateString(gameTitle, 20);
    avatarStatus = `
            <div class="avatar-status">
                <span data-testid="presence-icon" title="${gameTitle}" class="game icon-game"></span>
            </div>
        `;
    gameStatus = `
            <div class="friends-carousel-tile-sublabel">
                <div class="friends-carousel-tile-experience">${shoternGameTitle}</div>
            </div>
        `;
  } else if (userPresence.userPresenceType === 3) {
    // Studio
    avatarStatus = `
            <div class="avatar-status">
                <span data-testid="presence-icon" title="Studio" class="studio icon-studio"></span>
            </div>`;
    gameStatus = `<div class="friends-carousel-tile-sublabel"></div>`;
  }
  return `
        <div class="friends-carousel-tile">
            <div>
                <div>
                    <button type="button" class="options-dropdown" id="friend-tile-button">
                        <div class="friend-tile-content">
                            <div class="avatar avatar-card-fullbody" data-testid="avatar-card-container">
                                <a href="https://www.roblox.com/users/${userID}/profile" class="avatar-card-link" data-testid="avatar-card-link">
                                    <span class="thumbnail-2d-container avatar-card-image ">
                                        <img class="" src="${userheadshotURL}" alt="" title="">
                                    </span>
                                </a>
                                ${avatarStatus}
                            </div>
                            <a href="https://www.roblox.com/users/${userID}/profile" class="friends-carousel-tile-labels" data-testid="friends-carousel-tile-labels">
                                <div class="friends-carousel-tile-label">
                                    <div class="friends-carousel-tile-name">
                                        <span class="friends-carousel-display-name">${userRes.displayName}</span>
                                    </div>
                                </div>
                                ${gameStatus}
                            </a>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    `;
}
async function makeFriendDropdown(userID) {
  const userPresence = await fetchRoblox.getUserPresence(userID);
  const userRes = await fetchRoblox.getUserDetails(userID);
  if (userPresence.userPresenceType !== 2) {
    return `
      <ul>
        <li>
          <button type="button" class="friend-tile-dropdown-button">
            <span class="icon-chat-gray"></span> Chat with ${userRes.displayName}
          </button>
        </li>
        <li>
          <button type="button" class="friend-tile-dropdown-button">
            <span class="icon-viewdetails"></span> View Profile
          </button>
        </li>
      </ul>
    `;
  } else {
    const universeIconURL = (await fetchRoblox.getUniverseIcon(userPresence.universeId)).imageUrl || "";
    console.log(universeIconURL);
    const locationText = userPresence.lastLocation || "In game";
    return `
      <div class="in-game-friend-card">
        <button type="button" class="friend-tile-non-styled-button">
          <span class="thumbnail-2d-container friend-tile-game-card">
            <img class="game-card-thumb" src="${universeIconURL}" alt="" title="">
          </span>
        </button>
        <div class="friend-presence-info">
          <button type="button" class="friend-tile-non-styled-button">${locationText}</button>
          <button type="button" class="btn-growth-sm btn-full-width">Join</button>
        </div>
      </div>
      <ul>
        <li>
          <button type="button" class="friend-tile-dropdown-button">
            <span class="icon-chat-gray"></span> Chat with ${userRes.displayName}
          </button>
        </li>
        <li>
          <button type="button" class="friend-tile-dropdown-button">
            <span class="icon-viewdetails"></span> View Profile
          </button>
        </li>
      </ul>
    `;
  }
}

const verifiedLogo = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none'%3E%3Cg clip-path='url(%23clip0_8_46)'%3E%3Crect x='5.88818' width='22.89' height='22.89' transform='rotate(15 5.88818 0)' fill='%230066FF'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M20.543 8.7508L20.549 8.7568C21.15 9.3578 21.15 10.3318 20.549 10.9328L11.817 19.6648L7.45 15.2968C6.85 14.6958 6.85 13.7218 7.45 13.1218L7.457 13.1148C8.058 12.5138 9.031 12.5138 9.633 13.1148L11.817 15.2998L18.367 8.7508C18.968 8.1498 19.942 8.1498 20.543 8.7508Z' fill='white'/%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_8_46'%3E%3Crect width='28' height='28' fill='white'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E`;
const premiumLogo = `data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'%3E%3Cpath fill='white' d='M28 24a4 4 0 01-4 4H14v-4h10V4H4v24a4 4 0 01-4-4V4a4 4 0 014-4h20a4 4 0 014 4zm-7-7v4h-7v-4h3v-6h-6v17H7V7h14v10z'/%3E%3C/svg%3E`;

const blurCassFriends = `"/* Options button */.user-options-btn { position: absolute; top: 5px; right: 10px; background: transparent; border: none; padding: 0; cursor: pointer;}.user-options-btn img { width: 24px; height: 24px; display: block; opacity: 0.8;}.user-options-btn:hover img { opacity: 1;}/* Dropdown */.user-options-dropdown { position: absolute; top: 30px; right: 10px; background: #333; color: #fff; border-radius: 6px; padding: 4px 0; min-width: 160px; z-index: 100; display: none;}/* Open state */.user-options-dropdown.open { display: block;}/* Dropdown items */.user-options-item { width: 100%; background: none; border: none; color: #fff; padding: 8px 12px; text-align: left; cursor: pointer; font-size: 13px;}.user-options-item:hover { background: rgba(255, 255, 255, 0.08);}/* Destructive action */.user-options-item.danger { color: #ff6b6b;}.user-options-item.danger:hover { background: rgba(255, 107, 107, 0.15);}"`
const blurCssHome = `.blur-hide-friend-status .avatar-status { display: none !important;}.blur-hide-friend-status .friends-carousel-tile-experience { display: none !important;}.header { display: flex; align-items: center; padding: 10px;}.header img.profile-image { width: 128px; height: 128px; border-radius: 50%; background-color: #f7f7f8;}.header-text { display: flex; flex-direction: column; margin-left: 20px;}.header-text h1 { margin: 0; font-size: 22px; color: white; line-height: 1;}.header-text h2 { margin: 0 0 4px 0; font-size: 16px; color: #bfbfbf; line-height: 1;}.header-text h3 { margin-top: 0; font-size: 16px; color: #c8c8c8;}.name-row { display: flex; align-items: center; gap: 12px;}.premium-badge,.verified-badge { width: 24px; height: 24px;}"`;

// [2] PAGE SPECIFIC FUNCTIONS
async function blurPageAll() {
  // Page: all
  
  const notified = new Set();
const storage = new Storage();
await storage.initDefaults();

// -----------------------------
// Unreleased version popup
// -----------------------------
async function injectUnreleasedVersionPopup() {
  if (!(await storage.get("showUnreleasedVersionNotice"))) return;
  if (document.getElementById("unreleased-version-popup")) return;
  const popup = document.createElement("div");
  popup.id = "unreleased-version-popup";
  popup.innerHTML = `
    <div style="
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.45);
      z-index: 999998;
    "></div>

    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 999999;
      background: #111;
      color: #fff;
      padding: 18px 20px;
      border-radius: 10px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      box-shadow: 0 8px 30px rgba(0,0,0,.45);
      width: 420px;
      max-width: calc(100vw - 32px);
    ">
      <strong style="font-size: 15px;">Blur - Unreleased Version</strong>

      <div style="margin-top: 10px; opacity: .85;">
        Looks like you’re using an unreleased version of Blur.<br>
        Some features may be unstable or incomplete.
      </div>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px;">
        <button id="ack-unreleased" style="
          background: #2b7cff;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        ">Don’t show again</button>

        <button id="close-unreleased" style="
          background: transparent;
          border: 1px solid #444;
          color: #ccc;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        ">Close</button>
      </div>
    </div>
  `;
  popup.querySelector("#ack-unreleased").onclick = async () => {
    await storage.set("showUnreleasedVersionNotice", false);
    popup.remove();
  };
  popup.querySelector("#close-unreleased").onclick = () => {
    popup.remove();
  };
  document.body.appendChild(popup);
}

// -----------------------------
// Friend request polling
// -----------------------------
async function pollFriendRequests() {
  try {
    const res = await fetchRoblox.getFriendRequests();
    if (!res?.data) return;
    for (const req of res.data) {
      const userId = req.friendRequest.senderId;
      if (notified.has(userId)) continue;
      notified.add(userId);
      chrome.runtime.sendMessage({
        type: "FRIEND_REQUEST_DETECTED",
        userId
      });
    }
  } catch (e) {
    console.error("[content] Friend request poll failed", e);
  }
}

// Run once on load
injectUnreleasedVersionPopup();
pollFriendRequests();
setInterval(pollFriendRequests, 15_000);
}
window.blurPageAll = blurPageAll;

async function blurPageFriends() {
  // Page: friends
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
  return Array.from(document.querySelectorAll("#friends-web-app ul > li[id]")).filter(li => li.querySelector(".avatar-card") || li.querySelector(".thumbnail-2d-container"));
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
    cardsToPopulate.push({
      card,
      userId
    });
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
    const isBestFriend = authId && (await storage.containsInArray("bestFriends", userId, authId));
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "user-options-item user-options-toggle";
    toggleBtn.textContent = isBestFriend ? "Remove Best Friend" : "Add to Best Friends";
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
    document.querySelectorAll(".user-options-dropdown.open").forEach(d => d !== dropdown && d.classList.remove("open"));
    dropdown.classList.toggle("open");
  });
  document.addEventListener("click", () => dropdown.classList.remove("open"));
  card.append(btn, dropdown);
}

/* ----------------------------------------
 * Populate Card Data
 * -------------------------------------- */

async function populateUserData(cards) {
  await Promise.all(cards.map(async ({
    card,
    userId
  }) => {
    const headshot = card.querySelector(".thumbnail-2d-container.avatar-card-image img");
    const displayNameLink = card.querySelector(".avatar-name-container a");
    const labels = card.querySelectorAll(".avatar-card-label");
    const avatarStatus = card.querySelector(".avatar-status");
    const usernameLabel = labels[0];
    const gameLabel = labels[1];
    const [presence, user, thumb] = await Promise.all([fetchRoblox.getUserPresence(userId), fetchRoblox.getUserDetails(userId), fetchRoblox.getUserHeadshot(userId)]);
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
  }));
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
observer.observe(body, {
  childList: true,
  subtree: true
});

// Initial run
ensureInjected();
}
window.blurPageFriends = blurPageFriends;

async function blurPageHome() {
  // Page: home
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

  // Get greeting template
  let template = await storage.get("homeGreeting", "{greeting}, {displayName}!");
  if (typeof template !== "string") template = "{greeting}, {displayName}!";
  const date = new Date();
  const {
    displayName: displayNameValue,
    userName: userNameValue
  } = userRes;

  // -------------------------
  // Time-based greeting
  // -------------------------
  let greeting;
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) greeting = "Morning";else if (hour >= 12 && hour < 17) greeting = "Afternoon";else if (hour >= 17 && hour < 21) greeting = "Evening";else greeting = "Night";
  let greetingText = template.replaceAll("{greeting}", greeting);

  // -------------------------
  // Special messages (holidays & birthday)
  // -------------------------
  const month = date.getMonth() + 1;
  const day = date.getDate();
  let messages = [];

  // Holiday messages
  const holidayMessages = {
    "1-1": "🎉 New year, new me! Happy New Year!",
    "2-14": "💘 Love is in the air! Happy Valentine's Day!",
    "10-31": "🎃 Boo! Happy Halloween!",
    "12-25": "🎄 Merry Christmas!"
  };
  const holidayMessage = holidayMessages[`${month}-${day}`];
  if (holidayMessage) messages.push(holidayMessage);

  // User birthday
  if (await storage.get('celebrateUsersBirthday', false)) {
    try {
      const res = await fetchRoblox.getUserBirthday();
      if (res && month === res.birthMonth && day === res.birthDay) {
        messages.push("🎂 Happy Birthday!");
      }
    } catch (err) {
      console.error("Failed to fetch user birthday:", err);
    }
  }

  // Combine special messages
  let messageText = "";
  if (messages.length === 1) messageText = messages[0] + "!";else if (messages.length === 2) messageText = `${messages[0]} and ${messages[1]}!`;else if (messages.length > 2) messageText = messages.slice(0, -1).join(", ") + `, and ${messages[messages.length - 1]}!`;else messageText = "purrr"; // default if no special message

  // -------------------------
  // Replace displayName / username in greetingText
  // -------------------------
  const hasDisplay = greetingText.includes("{displayName}");
  const hasUsername = greetingText.includes("{username}");
  if (hasDisplay && hasUsername) greetingText = greetingText.replaceAll("{username}", "");
  if (hasDisplay) greetingText = greetingText.replaceAll("{displayName}", displayNameValue);
  if (!hasDisplay && hasUsername) greetingText = greetingText.replaceAll("{username}", userNameValue);
  greetingText = greetingText.replace(/\s+,/g, ",").replace(/,\s+/g, ", ").replace(/\s{2,}/g, " ").trim();

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

  // Set content
  newDiv.querySelector(".profile-image").src = headshotURL;
  newDiv.querySelector("#greeting").textContent = greetingText;
  newDiv.querySelector("#username").textContent = "@" + userRes.name;
  newDiv.querySelector("#message").textContent = messageText;

  // Show badges
  const isVerified = userRes.hasVerifiedBadge;
  const hasPremium = await fetchRoblox.getUserPremium();
  if (isVerified) newDiv.querySelector(".verified-badge").style.display = "inline";else if (hasPremium) newDiv.querySelector(".premium-badge").style.display = "inline";
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
    return {
      userId,
      placeholder
    };
  });
  for (const {
    userId,
    placeholder
  } of cardElements) {
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
              btn.addEventListener("click", () => {
                window.open(`https://www.roblox.com/users/${userId}/profile`, "_blank");
              });
            }
          });
          const joinBtn = dropdown.querySelector(".btn-growth-sm");
          if (joinBtn) {
            joinBtn.addEventListener("click", () => {
              window.open(`roblox://userId=${userId}`);
            });
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
  observer.observe(container, {
    childList: true,
    subtree: true
  });
  const existingTile = container.querySelector(".friends-carousel-tile .friends-carousel-display-name");
  if (existingTile?.textContent.trim() === "Connect") {
    existingTile.closest(".friends-carousel-tile").remove();
  }
}
async function renameFriendsRow() {
  const value = await storage.get("renameConnectionsToFriends", true);
  if (!value) return;
  await waitForSelector(".container-header.people-list-header");
  const header = document.querySelector("#HomeContainer > div.place-list-container > div > div > div.friend-carousel-container > div > div.container-header.people-list-header > h2");
  if (!header) return;
  let textNode = Array.from(header.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
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
}
window.blurPageHome = blurPageHome;

async function blurPageProfile() {
  // Page: profile
  
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
    label = 'Mutuals';
  } else {
    label = 'Mutual';
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
  const renameButton = button => {
    const textSpan = button.querySelector("span.web-blox-css-tss-1283320-Button-textContainer");
    if (textSpan && textSpan.textContent.trim() === "Remove Connection") {
      textSpan.textContent = "Unfriend";
    }
  };

  // Rename existing buttons
  document.querySelectorAll('button').forEach(renameButton);

  // Observe DOM for dynamically added buttons
  const observer = new MutationObserver(mutations => {
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
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
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
}
window.blurPageProfile = blurPageProfile;

// [3] INJECTOR RUNTIME

// ---------------------------
// Runtime Injector
// ---------------------------
window.__blurPages = window.__blurPages || {};

window.injectCSS = function (id, cssText) {
  if (!window._loadedStyles) window._loadedStyles = new Set();
  if (window._loadedStyles.has(id)) return;
  window._loadedStyles.add(id);

  const addStyle = () => {
    const style = document.createElement("style");
    style.dataset.extCss = id;
    style.textContent = cssText;
    document.head.appendChild(style);
    console.log(`[injectCSS] Injected CSS: ${id}`);
  };

  if (document.head) addStyle();
  else document.addEventListener("DOMContentLoaded", addStyle);
};

// ---------------------------
// The Injector
// ---------------------------
function simplePageInjector(pages) {
  // Sort pages by pattern length so specific pages run before catch-all
  pages.sort((a, b) => b.url.length - a.url.length);

  function matchUrl(pattern) {
    const regex = new RegExp(pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*"), "i");
    const matched = regex.test(window.location.href);
    console.log(`[matchUrl] Pattern "${pattern}" ${matched ? "matches" : "does not match"} URL: ${window.location.href}`);
    return matched;
  }

  async function runPageFeatures() {
    console.log("[runPageFeatures] Checking page features...");
    for (const page of pages) {
      if (!matchUrl(page.url)) continue;

      // Inject page-specific CSS if provided
      if (page.css) {
        injectCSS(page.run + "_css", page.css);
      }

      const funcs = Array.isArray(page.run) ? page.run : [page.run];
      for (const fnName of funcs) {
        if (typeof window[fnName] === "function") {
          console.log(`[runPageFeatures] Running function: ${fnName}`);
          try { await window[fnName](); }
          catch (e) { console.error(`[runPageFeatures] Error running function ${fnName}:`, e); }
        } else {
          console.warn(`[runPageFeatures] Function not found: ${fnName}`);
        }
      }
    }
  }

  function hookHistory(onChange) {
    const push = history.pushState;
    const replace = history.replaceState;

    history.pushState = function (...args) { push.apply(this, args); onChange(); };
    history.replaceState = function (...args) { replace.apply(this, args); onChange(); };
    window.addEventListener("popstate", onChange);
  }

  console.log("[simplePageInjector] Initializing injector...");
  runPageFeatures();
  hookHistory(runPageFeatures);
}

// ---------------------------
// Configure Pages with Optional CSS
// ---------------------------
simplePageInjector([
  { 
    url: "roblox.com/home*", 
    run: "blurPageHome",
    css: blurCssHome
  },
  { 
    url: "roblox.com/users/friends*", 
    run: "blurPageFriends",
    css: blurCassFriends
  },
  { 
    url: "roblox.com/users/*/profile", 
    run: "blurPageProfile",
  },
  { 
    url: "roblox.com/*", 
    run: "blurPageAll"
  }
]);