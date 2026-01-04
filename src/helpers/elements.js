export function waitForSelector(selector, timeout = 10000) {
    return new Promise(resolve => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        if (timeout) {
            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        }
    });
}