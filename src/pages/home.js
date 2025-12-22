import { waitForSelector } from "../helpers/elements.js";

// prevent running twice (Roblox navigates without reloads)
if (!window.__blurHideFriendsStatusLoaded) {
  window.__blurHideFriendsStatusLoaded = true;

  // inject CSS once
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
    `;

    document.head.appendChild(style);
  }

  async function hideFriendsStatus() {
    injectCSS();

    // wait for friends header
    const header = await waitForSelector(
      ".container-header.people-list-header"
    );

    const h2 = header?.querySelector("h2");
    if (!h2) return;

    const count = h2.querySelector(".friends-count");
    if (!count) return;

    // prevent duplicates
    if (h2.querySelector(".status-toggle")) return;

    // wrapper (label holds checkbox + text)
    const wrapper = document.createElement("label");
    wrapper.className = "status-toggle";
    wrapper.style.marginLeft = "20px";
    wrapper.style.cursor = "pointer";
    wrapper.style.fontSize = "13px";
    wrapper.style.userSelect = "none";
    wrapper.style.display = "inline-flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "4px";

    // checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    // label text
    const labelText = document.createElement("span");
    labelText.textContent = "Hide friends status?";

    // assemble
    wrapper.appendChild(checkbox);
    wrapper.appendChild(labelText);

    // insert after the friends count
    count.insertAdjacentElement("afterend", wrapper);

    // toggle handler
    checkbox.addEventListener("change", () => {
      document.body.classList.toggle(
        "blur-hide-friend-status",
        checkbox.checked
      );
    });
  }

  hideFriendsStatus();
}