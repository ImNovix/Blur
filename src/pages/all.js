import { fetchRoblox } from "../helpers/robloxAPI.js";
import { Storage } from "../helpers/storage.js";

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