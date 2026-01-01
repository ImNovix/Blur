import { fetchRoblox } from "../helpers/robloxAPI.js";

const notified = new Set();

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

setInterval(pollFriendRequests, 15_000);
pollFriendRequests();
