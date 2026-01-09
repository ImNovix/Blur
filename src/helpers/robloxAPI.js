export class fetchRoblox {
    // --- Account Details ---
    static async getAuth() {
        return await fetchRobloxAPI("users", "/v1/users/authenticated");
    }

    static async getUserBirthday() {
        return await fetchRobloxAPI("users", "v1/birthdate");
    }

    // --- Friends ---
    static async getFriendCount(userID = "0") {
        return userID === "0"
            ? await fetchRobloxAPI("friends", "v1/my/friends/count")
            : await fetchRobloxAPI("friends", `v1/users/${userID}/friends/count`);
    }

    static async getFriends(userID = "0") {
        if (userID === "0") {
            userID = (await fetchRoblox.getAuth()).id;
        }
        return await fetchRobloxAPI("friends", `v1/users/${userID}/friends`);
    }

    static async getSuggestedFriends() {
        const authID = (await fetchRoblox.getAuth()).id;
        return await fetchRobloxAPI("friends", `v1/users/${authID}/friends/recommendations?source=AddFriendsPage`);
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
        const res = await fetchRobloxAPI("friends", `v1/users/${authID}/friends/statuses?userIds=${userID}`);
        return res.data[0];
    }

    static async getFriendshipDuration(userID) {

        const body = {
            rankingStrategy: "tc_info_boost",
            userIds: [userID]
        };

        try {
            const res = await fetchRobloxAPI("apis", "/profile-insights-api/v1/multiProfileInsights", {
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
        return await fetchRobloxAPI("friends", `v1/users/${userID}/accept-friend-request`, { method: "POST", });
    }

    static async declineFriendRequest(userID) {
        return await fetchRobloxAPI("friends", `v1/users/${userID}/decline-friend-request`, { method: "POST", });
    }

    static async getFriendRequests() {
        return await fetchRobloxAPI("friends", "v1/my/friends/requests");
    }

    // Users
    static async getUserDetails(userID = "0") {
        if (userID === "0") {
            userID = (await fetchRoblox.getAuth()).id;
        }
        return await fetchRobloxAPI("users", `v1/users/${userID}`);
    }

    static async getUserPresence(userID = "0") {
        if (userID === "0") { userID = (await fetchRoblox.getAuth()).id; }
        return (await fetchRobloxAPI("presence", `v1/presence/users`,
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
        return await fetchRobloxAPI("premiumfeatures", `v1/users/${userID}/validate-membership`);
    }

    // --- Thumbnails ---
    static async getThumbnailsBatch(jsonReq) {
        return await fetchRobloxAPI("thumbnails", "/v1/batch", {
            method: "POST",
            body: JSON.stringify(jsonReq)
        })
    }

    static async getUserHeadshot(userID = "0", size="150x150", format="Png", isCircular="false") {
        if (userID === "0") {
            userID = (await fetchRoblox.getAuth()).id;
        }
        const res = await fetchRobloxAPI("thumbnails", `v1/users/avatar-headshot?userIds=${userID}&size=${size}&format=${format}&isCircular=${isCircular}`);
        return res.data[0];
    }

    static async getUniverseIcon(universeID, size="150x150", format="Png", isCircular="false") {
        return (await fetchRobloxAPI("thumbnails", `v1/games/icons?universeIds=${universeID}&size=${size}&format=${format}&isCircular=${isCircular}`)).data[0];
    }

    static async getOutfitThumbnail(outfitIds, size, format, isCircular) {
        return await fetchRobloxAPI("thumbnails", `v1/users/outfits?userOutfitIds=${outfitIds}&size=420x420&format=Png&isCircular=false`);
    }

    static async getAssetThumbnail(assetIds, size, format, isCircular) {
        return await fetchRobloxAPI("thumbnails", `v1/assets?assetIds=${assetIds}&returnPolicy=PlaceHolder&size=420x420&format=Png&isCircular=false`);
    }

    static async getUserBust(userID) {
        return (await fetchRobloxAPI("thumbnails", `v1/users/avatar-bust?userIds=${userID}&size=420x420&format=Png&isCircular=false`)).data[0];
    }

    static async getUserFullbody(userID) {
        return (await fetchRobloxAPI("thumbnails", `v1/users/avatar?userIds=${userID}&size=420x420&format=Png&isCircular=false`)).data[0];
    }

    // Avatar
    static async getUsersAvatar(userID) {
        // Fetch raw avatar data
        const res = await fetchRobloxAPI("avatar",`v2/avatar/users/${userID}/avatar`);
        const allAssets = res.assets || [];
        const emotes = res.emotes || [];

        // Define animation types
        const animationTypes = new Set([
            "IdleAnimation",
            "RunAnimation",
            "JumpAnimation",
            "WalkAnimation",
            "FallAnimation"
        ]);

        const animations = [];
        const assets = [];

        // Separate assets and animations
        allAssets.forEach(a => {
            if (animationTypes.has(a.assetType?.name)) {
                animations.push(a);
            } else {
                assets.push(a);
            }
        });

        return {
            playerAvatarType: res.playerAvatarType,
            scales: res.scales,
            bodyColor3s: res.bodyColor3s,
            assets: assets,
            animations: animations,
            emotes: emotes
        };
    }

    static async getOutfitDetails(outfitID) {
        return await fetchRobloxAPI("avatar", `v3/outfits/${outfitID}/details`);
    }

    static async getUserOutfits(userID) {
        // Fetch outfit list
        const outfitRes = await fetchRobloxAPI("avatar", `v2/avatar/users/${userID}/outfits?itemsPerPage=25&isEditable=true`);

        const outfits = outfitRes.data;

        // Build ID list for thumbnails
        const ids = outfits.map(o => o.id).join(",");

        // Fetch thumbnails
        const thumbRes = await fetchRoblox.getOutfitThumbnail(ids);

        // Build map: outfitId → imageUrl
        const thumbnailMap = new Map();
        thumbRes.data.forEach(t => {
            thumbnailMap.set(t.targetId, t.imageUrl);
        });

        // Fetch deep details for every outfit in parallel
        const detailed = await Promise.all(
            outfits.map(async outfit => {
                const details = await fetchRoblox.getOutfitDetails(outfit.id);

                return {
                    // Base outfit metadata
                    id: outfit.id,
                    name: outfit.name,
                    isEditable: outfit.isEditable,
                    outfitType: outfit.outfitType,

                    // Thumbnail
                    thumbnail: thumbnailMap.get(outfit.id) || null,

                    // Full avatar configuration
                    assets: details.assets,
                    bodyColor3s: details.bodyColor3s,
                    scale: details.scale,
                    playerAvatarType: details.playerAvatarType,
                    inventoryType: details.inventoryType
                };
            })
        );

        return detailed;
    }

    // Assets
    static async getAssetDetails(assetIds) {
        if (!Array.isArray(assetIds)) {
            // If you passed a comma-separated string, split it
            assetIds = assetIds.split(",").map(id => id.trim());
        }

        // Build the POST body in the format Roblox expects
        const body = {
            items: assetIds.map(id => ({
                itemType: "Asset",
                id: Number(id)
            }))
        };

        // Call the API
        const res = await fetchRobloxAPI(
            "catalog", "v1/catalog/items/details",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            }
        );

        return res;
    }

    // --- Chat System ---
    static async ableToChatWithUser(userID, converastationID) {

    }
}

async function fetchRobloxAPI(service, path, options = {}) {
    // Build URL directly: https://service.roblox.com/...
    const url = path.startsWith("http")
        ? path
        : `https://${service}.roblox.com/${path.replace(/^\/+/, "")}`;

    const method = (options.method || "GET").toUpperCase();
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    let headers = { ...(options.headers || {}) };
    let attempt = 0;

    // Pre-seed CSRF for write requests
    if (isWrite && !headers["X-CSRF-TOKEN"]) {
        headers["X-CSRF-TOKEN"] = "";
        headers["Content-Type"] = "application/json";
    }

    while (attempt < 2) {
        const response = await fetch(url, {
            ...options,
            method,
            headers,
            credentials: options.credentials ?? "include"
        });

        // CSRF refresh
        if (response.status === 403 && isWrite) {
            const token = response.headers.get("x-csrf-token");
            if (token && attempt === 0) {
                headers["X-CSRF-TOKEN"] = token;
                attempt++;
                continue;
            }
        }

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`[Roblox API] ${method} ${url} → ${response.status}\n${body}`);
        }

        const contentType = response.headers.get("content-type") || "";
        return contentType.includes("application/json")
            ? response.json()
            : response.text();
    }

    throw new Error("Failed to fetch with valid CSRF token");
}

async function fetchOpenCloudAPI(endpoint, options = {}) {
    // Build full URL if not a full link
    const url = endpoint.startsWith("http")
        ? endpoint
        : `https://apis.roblox.com/${endpoint.replace(/^\/+/, "")}`;

    const method = (options.method || "GET").toUpperCase();
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    let headers = { ...(options.headers || {}) };
    let attempt = 0;

    // Pre-seed CSRF for write requests
    if (isWrite && !headers["X-CSRF-TOKEN"]) {
        headers["X-CSRF-TOKEN"] = "";
        headers["Content-Type"] = "application/json";
    }

    while (attempt < 2) {
        const response = await fetch(url, {
            ...options,
            method,
            headers,
            credentials: options.credentials ?? "include",
        });

        // Refresh CSRF if required
        if (response.status === 403 && isWrite) {
            const token = response.headers.get("x-csrf-token");
            if (token && attempt === 0) {
                headers["X-CSRF-TOKEN"] = token;
                attempt++;
                continue;
            }
        }

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`[OpenCloud API] ${method} ${url} → ${response.status}\n${body}`);
        }

        const contentType = response.headers.get("content-type") || "";
        return contentType.includes("application/json")
            ? response.json()
            : response.text();
    }

    throw new Error("Failed to fetch Open Cloud API with valid CSRF token");
}