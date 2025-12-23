import { getUserDetails } from "../modules/users.js";
import { getUserHeadshot } from "../modules/thumbnails.js";

export async function makeFriendCardHTML(userID) {
    const res = await getUserDetails(userID);
    console.log((await getUserHeadshot(userID)));
    const headshotURL = (await getUserHeadshot(userID)).imageUrl;

    return `
        <li id="${res.id}" class="list-item avatar-card">
            <div class="avatar-card-container">
                <div class="avatar-card-content">
                    <div class="avatar avatar-card-fullbody" data-testid="avatar-card-container">
                        <a href="/users/${res.id}/profile" class="avatar-card-link" data-testid="avatar-card-link">
                            <span class="thumbnail-2d-container avatar-card-image ">
                                <img class="" src="${headshotURL}" alt="" title="">
                            </span>
                        </a>
                        <div class="avatar-status"></div>
                    </div>
                    <div class="avatar-card-caption">
                        <span>
                            <div class="avatar-name-container">
                                <a href="/users/${res.id}/profile" class="text-overflow avatar-name">${res.displayName}</a>
                            </div>
                            <div class="avatar-card-label"> @${res.name} </div>
                            <div class="avatar-card-label">Offline</div>
                        </span>
                    </div>
                </div>
            </div>
        </li>
    `;
}