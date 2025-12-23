async function fetchRobloxAPI(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const isPost = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

    let headers = { ...(options.headers || {}) };
    let attempt = 0;

    // If it's a POST/PUT/PATCH/DELETE, pre-include the CSRF token from options or empty string
    if (isPost && !headers['X-CSRF-TOKEN']) {
        headers['X-CSRF-TOKEN'] = ''; // Roblox will return a new token if empty/invalid
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

export {
    fetchRobloxAPI
};