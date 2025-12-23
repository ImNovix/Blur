import { fetchRobloxAPI } from "./api-helper.js";
import { getAuth } from "./account-details.js"

export async function getUserHeadshot(userID = "0", size="150x150", format="Png", isCircular="false") {
    if (userID === "0") {
        userID = (await getAuth()).id;
        const res = await fetchRobloxAPI(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userID}&size=${size}&format=${format}&isCircular=${isCircular}`);
        return res.data[0];
    } else {
        const res = await fetchRobloxAPI(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userID}&size=${size}&format=${format}&isCircular=${isCircular}`);
        return res.data[0];
    }
}