function waitForSelector(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
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
                reject(
                    new Error(`Timeout waiting for ${selector}`)
                );
            }, timeout);
        }
    });
}


async function replaceElement(selector, newElement) {
    const target = await waitForSelector(selector);
    target.replaceWith(newElement);
}

export {
    waitForSelector,
    replaceElement
}
