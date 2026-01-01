import { fetchRoblox } from "./helpers/robloxAPI.js";

// Store metadata for active notifications
const activeFriendRequests = new Map();
const notifiedRequests = new Set(); // prevents duplicate notifications

// -------------------------
// Send notification
// -------------------------
export async function sendFriendRequestNotification({ userId }) {
  if (!userId) return;

  // Prevent duplicate notifications
  if (notifiedRequests.has(userId)) return;
  notifiedRequests.add(userId);

  // Fetch username
  let username;
  try {
    const userDetails = await fetchRoblox.getUserDetails(userId);
    username = userDetails.name || `User ${userId}`;
  } catch (err) {
    console.error("Failed to fetch user details for", userId, err);
    username = `User ${userId}`;
  }

  const id = `friend-request-${userId}-${Date.now()}`;
  activeFriendRequests.set(id, userId);

  let iconUrl = (await fetchRoblox.getUserHeadshot(userId)).imageUrl || chrome.runtime.getURL('src/images/icons/128.png');

  chrome.notifications.create(id, {
    type: "basic",
    iconUrl,
    title: "Blur - New Friend Request",
    message: `@${username} has added you!`,
    buttons: [
      { title: "Accept Request" },
      { title: "Ignore Request" }
    ]
  });
}

// -------------------------
// Handle notification button clicks
// -------------------------
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (!notificationId.startsWith("friend-request-")) return;

  const userId = activeFriendRequests.get(notificationId);
  if (!userId) return;

  if (buttonIndex === 0) {
    console.log("Accept request clicked for", userId);
    fetchRoblox.acceptFriendRequest(userId);
  } else if (buttonIndex === 1) {
    console.log("Ignore request clicked for", userId);
    fetchRoblox.declineFriendRequest(userId);
  }

  chrome.notifications.clear(notificationId);
  activeFriendRequests.delete(notificationId);
  notifiedRequests.delete(userId);
});

// -------------------------
// Handle notification body clicks
// -------------------------
chrome.notifications.onClicked.addListener((notificationId) => {
  if (!notificationId.startsWith("friend-request-")) return;

  chrome.tabs.create({ url: "https://www.roblox.com/users/friends#!/friend-requests" });

  const userId = activeFriendRequests.get(notificationId);
  if (userId) {
    activeFriendRequests.delete(notificationId);
    notifiedRequests.delete(userId);
  }

  chrome.notifications.clear(notificationId);
});

// -------------------------
// Poll for new friend requests
// -------------------------
async function pollFriendRequests() {
  try {
    const response = await fetchRoblox.getFriendRequests();
    if (!response || !response.data) return;

    for (const request of response.data) {
      const userId = request.friendRequest.senderId;
      sendFriendRequestNotification({ userId });
    }
  } catch (err) {
    console.error("Failed to fetch friend requests:", err);
  }
}

// -------------------------
// Start polling every 15 seconds
// -------------------------
setInterval(pollFriendRequests, 15_000);
pollFriendRequests(); // initial fetch

// -------------------------
// Optional: handle extension install
// -------------------------
chrome.runtime.onInstalled.addListener(() => {
  console.log("[background] Blur extension installed and service worker running");
});