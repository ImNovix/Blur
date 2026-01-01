// background.js
import { fetchRoblox } from "./helpers/robloxAPI.js";

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "FRIEND_REQUEST_DETECTED") return;

  const { userId } = msg;

  (async () => {
    let username = `User ${userId}`;
    try {
      const user = await fetchRoblox.getUserDetails(userId);
      username = user.name ?? username;
    } catch {}

    const icon =
      (await fetchRoblox.getUserHeadshot(userId))?.imageUrl ??
      chrome.runtime.getURL("src/images/icons/128.png");

    chrome.notifications.create(`friend-${userId}`, {
      type: "basic",
      iconUrl: icon,
      title: "Blur - New Friend Request",
      message: `@${username} has added you!`,
      buttons: [
        { title: "Accept Request" },
        { title: "Ignore Request" }
      ]
    });
  })();
});