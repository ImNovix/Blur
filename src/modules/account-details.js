import { fetchRobloxAPI } from "./api-helper.js";

export async function getAuth() {
    return (await fetchRobloxAPI(`https://users.roblox.com/v1/users/authenticated`));
}