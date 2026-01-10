import { waitForSelector } from "../helpers/elements.js";
import { fetchRoblox } from "../helpers/robloxAPI.js";
import { Storage } from "../helpers/storage.js"

const notified = new Set();

const storage = new Storage();
await storage.initDefaults();

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

async function injectSpotifyPlayer() {
  const value = await storage.get("enableSpotifyPlayer", false);
  if (!value) return;

  await waitForSelector("");
  const sidebar = document.querySelector("");

  
}

// Run once on load
pollFriendRequests();
setInterval(pollFriendRequests, 15_000);