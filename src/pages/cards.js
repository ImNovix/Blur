import { getUserDetails, getUserPresence } from "../modules/users.js";
import { getUserHeadshot, getUniverseIcon } from "../modules/thumbnails.js";
import { truncateString } from "../helpers/usefull.js";

export async function makeFriendCardHTML(userID) {
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

export async function makeFriendCardSmall(userID) {
    const userPresence = await getUserPresence(userID);
    const userRes = await getUserDetails(userID);
    const userheadshotURL = (await getUserHeadshot(userID)).imageUrl;

    let avatarStatus;
    let gameStatus;

    if (userPresence.userPresenceType = 0) {
        // Offline
        avatarStatus = `<div class="avatar-status"></div>`;
        gameStatus = `<div class="friends-carousel-tile-sublabel"></div>`;
    } else if (userPresence.userPresenceType = 1) {
        // Website
        avatarStatus = `
            <div class="avatar-status">
                <span data-testid="presence-icon" title="Website" class="online icon-online"></span>
            </div>
        `;
        gameStatus = `<div class="friends-carousel-tile-sublabel"></div>`;
    } else if (userPresence.userPresenceType = 2) {
        // In-Game
        const gameTitle = userPresence.lastLocation;
        const shoternGameTitle = truncateString(gameTitle, 15);
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
    } else if (userPresence.userPresenceType = 3) {
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

export async function makeFriendDropdown(userID) {
    const userPresence = await getUserPresence(userID);
    const userRes = await getUserDetails(userID);

    if (userPresence.userPresenceType != 2 && userPresence.placeId != null) {
        return `
            <div style="position: absolute; top: 329px; left: 189px; z-index: 1002; width: 240px;">
                <div class="friend-tile-dropdown">
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
                </div>
            </div>
        `;
    } else {
        const universeIconURL = await getUniverseIcon(userPresence.universeId);
        return `
        <div style="position: absolute; top: 342px; left: 43.5px; z-index: 1002; width: 315px;">
            <div class="friend-tile-dropdown">
                <div class="in-game-friend-card">
                    <button type="button" class="friend-tile-non-styled-button">
                        <span class="thumbnail-2d-container friend-tile-game-card">
                            <img class="game-card-thumb" src="${universeIconURL}" alt="" title="">
                        </span>
                    </button>
                    <div class="friend-presence-info">
                        <button type="button" class="friend-tile-non-styled-button">${userPresence.lastLocation}</button>
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
            </div>
        </div>
        `;
    }
}