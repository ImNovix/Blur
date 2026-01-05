export class fetchRoblox {
    static defults = {
        thumbnails: {
            userHeadshot: {
                size: [
                    '48x48',
                    '50x50',
                    '60x60',
                    '75x75',
                    '100x100',
                    '110x110',
                    '150x150',
                    '180x180',
                    '352x352',
                    '720x720'
                ],
                format: [
                    'Png',
                    'Jpeg',
                    'Webp'
                ],
                isCircular: [
                    'true',
                    'false'
                ]
            }
        }
    };

    // Account Details
    static async getAuth() {
        return await fetchRobloxAPI("https://users.roblox.com/v1/users/authenticated");
    }

    static async getUserBirthday() {
        return await fetchRobloxAPI(`https://users.roblox.com/v1/birthdate`);
    }

    // Friends
    static async getFriendCount(userID = "0") {
        if (userID === "0") {
            return await fetchRobloxAPI(`https://friends.roblox.com/v1/my/friends/count`);
        } else {
            return await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${userID}/friends/count`);
        }
    }

    static async getFriends(userID = "0") {
        if (userID === "0") {
            userID = (await fetchRoblox.getAuth()).id;
        }
        return await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${userID}/friends`);
    }

    static async getSuggestedFriends() {
        const authID = (await fetchRoblox.getAuth()).id;
        return await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${authID}/friends/recommendations?source=AddFriendsPage`);
    }

    static async getMutualFriends(userID) {
        try {
            const [friendsARes, friendsBRes] = await Promise.all([
                fetchRoblox.getFriends(),       // current user's friends
                fetchRoblox.getFriends(userID)  // target user's friends
            ]);

            // Extract arrays safely
            const friendsA = Array.isArray(friendsARes.data) ? friendsARes.data : [];
            const friendsB = Array.isArray(friendsBRes.data) ? friendsBRes.data : [];

            // Compute mutuals
            const friendIdsB = new Set(friendsB.map(f => f.id));
            const mutual = friendsA.filter(f => friendIdsB.has(f.id));

            return {
                mutualFriends: mutual,
                count: mutual.length
            };
        } catch (err) {
            console.error("Error fetching mutual friends:", err);
            return { mutualFriends: [], count: 0, error: err.message };
        }
    }

    static async getFriendship(userID) {
        const authID = (await fetchRoblox.getAuth()).id;
        const res = await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${authID}/friends/statuses?userIds=${userID}`);
        return res.data[0];
    }

    static async getFriendshipDuration(userID) {
        const url = "https://apis.roblox.com/profile-insights-api/v1/multiProfileInsights";

        const body = {
            rankingStrategy: "tc_info_boost",
            userIds: [userID]
        };

        try {
            const res = await fetchRobloxAPI(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const insights = res.userInsights?.[0]?.profileInsights || [];

            // Find the friendship date insight
            const friendshipInsight = insights.find(i => i.friendshipAgeInsight);
            if (!friendshipInsight) return "Unknown";

            const { seconds, nanos } = friendshipInsight.friendshipAgeInsight.friendsSinceDateTime;
            const friendsSince = new Date(seconds * 1000 + nanos / 1e6);

            // Scoped formatting function
            const formatFriendsSince = (date) => {
                if (!(date instanceof Date)) return date;

                const day = date.getDate();
                const year = date.getFullYear();
                const month = date.toLocaleString(undefined, { month: "long" });

                const getOrdinal = (n) => {
                    if (n >= 11 && n <= 13) return "th";
                    switch (n % 10) {
                        case 1: return "st";
                        case 2: return "nd";
                        case 3: return "rd";
                        default: return "th";
                    }
                };

                return `${month} ${day}${getOrdinal(day)}, ${year}`;
            };

            return formatFriendsSince(friendsSince);

        } catch (err) {
            console.error("Failed to fetch friendship duration:", err);
            return "Unknown";
        }
    }

    static async acceptFriendRequest(userID) {
        return await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${userID}/accept-friend-request`, { method: "POST", });
    }

    static async declineFriendRequest(userID) {
        return await fetchRobloxAPI(`https://friends.roblox.com/v1/users/${userID}/decline-friend-request`, { method: "POST", });
    }

    static async getFriendRequests() {
        return await fetchRobloxAPI(`https://friends.roblox.com/v1/my/friends/requests`);
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

    static async getUserPremium(userID = "0") {
        if (userID === "0") {
            userID = (await fetchRoblox.getAuth()).id;
        }
        return await fetchRobloxAPI(`https://premiumfeatures.roblox.com/v1/users/${userID}/validate-membership`);
    }

    // Thumbnails
    static async getUserHeadshot(userID = "0", size="150x150", format="Png", isCircular="false") {
        if (userID === "0") {
            userID = (await fetchRoblox.getAuth()).id;
        }
        const res = await fetchRobloxAPI(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userID}&size=${size}&format=${format}&isCircular=${isCircular}`);
        return res.data[0];
    }

    static async getUniverseIcon(universeID, size="150x150", format="Png", isCircular="false") {
        return (await fetchRobloxAPI(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeID}&size=${size}&format=${format}&isCircular=${isCircular}`)).data[0];
    }

    static async getOutfitThumbnail(outfitID, size, format, isCircular) {
        return await fetchRobloxAPI(``);
    }

    // Avatar
    static async getUsersAvatar(userID) {
        const res = await fetchRobloxAPI(`https://avatar.roblox.com/v1/users/${userID}/avatar`);
        const assets = '';
        const animations = '';
        const emotes = ''; 

        return {
            playerAvatarType: res.playerAvatarType,
            scales: res.scales,
            bodyColors: res.bodyColors,
            assets,
            animations,
            emotes
        }
    }

    static async getOutfitDetails(outfitID) {
        return await fetchRobloxAPI(`https://avatar.roblox.com/v3/outfits/${outfitID}/details`);
    }

    static async getUserOutfits(userID) {

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