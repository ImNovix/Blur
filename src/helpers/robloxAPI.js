export class fetchRoblox {
    // Account Details
    static async getAuth() {
        return await fetchRobloxAPI("https://users.roblox.com/v1/users/authenticated");
    }

    // Friends 
    static async getFriendCount(userID = "0") {
        if (userID === "0") {
            return await fetchRobloxAPI(`https://friends.roblox.com/v1/my/friends/count`);
        } else {
            return (await fetchRobloxAPI(`https://friends.roblox.com/v1/${userID}/friends/count`))
        }
    }

    static async getSuggestedFriends() {
        return await fetchRobloxAPI(`https://friends.roblox.com/v1/users/3602693727/friends/recommendations?source=AddFriendsPage`)
    }

    // Users
    static async getUserDetails(userID = "0") {
        if (userID === "0") {
            userID = (await fetchRoblox.getAuth()).id;
        }
        return await fetchRobloxAPI(`https://users.roblox.com/v1/users/${userID}`);
    }

    static async getUserPresence(userID = "0") {
        if (userID === "0") {
            userID = (await fetchRoblox.getAuth()).id;
        }
        return (await fetchRobloxAPI(`https://presence.roblox.com/v1/presence/users`,
            {
                method: "POST",
                body: JSON.stringify({  "userIds": [userID] }),
            }
        )).userPresences[0];
    }

    // Thumbnails
    static async getUserHeadshot(userID = "0", size="150x150", format="Png", isCircular="false") {
        if (userID === "0") {
            userID = (await fetchRoblox.getAuth()).id;
            const res = await fetchRobloxAPI(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userID}&size=${size}&format=${format}&isCircular=${isCircular}`);
            return res.data[0];
        } else {
            const res = await fetchRobloxAPI(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userID}&size=${size}&format=${format}&isCircular=${isCircular}`);
            return res.data[0];
        }
    }

    static async getUniverseIcon(universeID, size="150x150", format="Png", isCircular="false") {
        return (await fetchRobloxAPI(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeID}&size=${size}&format=${format}&isCircular=${isCircular}`)).data[0];
    }
}

async function fetchRobloxAPI(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const isPost = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

    let headers = { ...(options.headers || {}) };
    let attempt = 0;

    // If it's a POST/PUT/PATCH/DELETE, pre-include the CSRF token from options or empty string
    if (isPost && !headers['X-CSRF-TOKEN']) {
        headers['X-CSRF-TOKEN'] = ''; // Roblox will return a new token if empty/invalid
        headers['Content-Type'] = 'application/json';
    }

    while (attempt < 2) {
        const response = await fetch(url, {
            ...options,
            method,
            headers,
            credentials: 'include'
        });

        // Roblox returns 403 with x-csrf-token header if CSRF token is missing or invalid
        if (response.status === 403 && isPost) {
            const csrfToken = response.headers.get('x-csrf-token');
            if (csrfToken && attempt === 0) {
                headers['X-CSRF-TOKEN'] = csrfToken; // Retry with valid token
                attempt++;
                continue;
            }
        }

        if (!response.ok) {
            throw new Error(`API call to ${url} failed with status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        } else {
            return response.text();
        }
    }

    throw new Error("Failed to fetch with valid CSRF token");
}