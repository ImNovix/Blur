import { fetchRobloxAPI } from "./api-helper.js";
import { getAuth } from "./account-details.js";

export async function getUserDetails(userID = "0") {
    if (userID === "0") {
        userID = (await getAuth()).id;
    }
    return await fetchRobloxAPI(`https://users.roblox.com/v1/users/${userID}`);
}

export async function getUserPresence(userID = "0") {
    if (userID === "0") {
        userID = (await getAuth()).id;
    }
    return (await fetchRobloxAPI(`https://presence.roblox.com/v1/presence/users`,
        {
            method: "POST",
            body: JSON.stringify({  "userIds": [userID] }),
        }
    )).userPresences[0];
}