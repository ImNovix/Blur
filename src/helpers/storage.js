const AREA = chrome.storage.local;

/**
 * Default configuration values
 * Add new keys here and they will auto-initialize
 */
const DEFAULTS = {
  hideFriendStatus: false,
  hideFriendGame: false,
  blurIntensity: 6
};

/**
 * Initialize storage with defaults (non-destructive)
 * Safe to call multiple times
 */
export function initDefaults() {
  return new Promise(resolve => {
    AREA.get(null, current => {
      const toSet = {};

      for (const key in DEFAULTS) {
        if (!(key in current)) {
          toSet[key] = DEFAULTS[key];
        }
      }

      if (Object.keys(toSet).length > 0) {
        AREA.set(toSet, resolve);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get a value
 */
export function get(key, fallback = DEFAULTS[key]) {
  return new Promise(resolve => {
    AREA.get([key], result => {
      resolve(result[key] ?? fallback);
    });
  });
}

/**
 * Set a value
 */
export function set(key, value) {
  return new Promise(resolve => {
    AREA.set({ [key]: value }, resolve);
  });
}

/**
 * Toggle a boolean
 */
export async function toggle(key) {
  const current = await get(key);
  const next = !current;
  await set(key, next);
  return next;
}