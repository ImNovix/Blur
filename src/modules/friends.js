import { fetchRobloxAPI } from "./api-helper.js";

export async function getFriendCount(userID = "0") {
    if (userID = "0") {
        return await fetchRobloxAPI(`https://friends.roblox.com/v1/my/friends/count`);
    } else {
        return (await fetchRobloxAPI(`https://friends.roblox.com/v1/${userID}/friends/count`))
    }
}