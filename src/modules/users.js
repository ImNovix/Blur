import { fetchRobloxAPI } from "./api-helper.js";
import { getAuth } from "./account-details.js";

export async function getUserDetails(userID = "0") {
    if (userID === "0") {
        userID = (await getAuth()).id;
    }
    return (await fetchRobloxAPI(`https://users.roblox.com/v1/users/${userID}`));
}