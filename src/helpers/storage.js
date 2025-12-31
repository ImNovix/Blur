export class Storage {
  constructor(area = chrome.storage.local) {
    this.area = area;

    this.DEFAULTS = {
      hideFriendStatus: false,
      removeConnectButton: true,
      renameConnectionsToFriends: true,
      homeGreeting: "{greeting}, {displayName}!",
    };

    this.PER_USER_KEYS = ["bestFriends"];
  }

  isPerUserKey(key) {
    return this.PER_USER_KEYS.includes(key);
  }

  initDefaults() {
    return new Promise(resolve => {
      this.area.get(null, current => {
        const toSet = {};
        for (const key in this.DEFAULTS) {
          const defaultValue = this.DEFAULTS[key];
          const currentValue = current[key];

          const isMissing = !(key in current);
          const isBroken =
            currentValue === null ||
            currentValue === undefined ||
            (Array.isArray(defaultValue) && !Array.isArray(currentValue)) ||
            (typeof defaultValue === "object" &&
              !Array.isArray(defaultValue) &&
              typeof currentValue !== "object");

          if (isMissing || isBroken) toSet[key] = structuredClone(defaultValue);
        }

        if (Object.keys(toSet).length > 0) {
          console.log("[Storage] Initializing defaults:", toSet);
          this.area.set(toSet, resolve);
        } else resolve();
      });
    });
  }

  get(key, fallback, authID) {
    return new Promise(resolve => {
      this.area.get(null, result => {
        let value;

        if (authID && this.isPerUserKey(key)) {
          const userObj = result[authID] || {};
          value = userObj[key];

          if (value === undefined) value = fallback ?? [];
          if (Array.isArray(fallback) && !Array.isArray(value)) value = [];

          console.log(`[Storage] GET user ${authID} → "${key}":`, value);
        } else {
          value = result[key] ?? fallback ?? this.DEFAULTS[key];
          console.log(`[Storage] GET global key "${key}":`, value);
        }

        resolve(value);
      });
    });
  }

  set(key, value, authID) {
    return new Promise(resolve => {
      this.area.get(null, result => {
        if (authID && this.isPerUserKey(key)) {
          const userObj = result[authID] || {};

          if (!Array.isArray(value)) value = [];

          userObj[key] = value;

          console.log(`[Storage] SET user ${authID} → "${key}":`, value);
          this.area.set({ [authID]: userObj }, resolve);
        } else {
          console.log(`[Storage] SET global key "${key}":`, value);
          this.area.set({ [key]: value }, resolve);
        }
      });
    });
  }

  async addToArray(key, item, authID) {
    if (!authID) throw new Error("authID required for per-user arrays");
    let arr = await this.get(key, [], authID);
    if (!Array.isArray(arr)) arr = [];
    if (!arr.includes(item)) {
      arr.push(item);
      await this.set(key, arr, authID);
    }
    console.log(`[Storage] addToArray "${key}" for ${authID}:`, arr);
    return arr;
  }

  async removeFromArray(key, item, authID) {
    if (!authID) throw new Error("authID required for per-user arrays");
    let arr = await this.get(key, [], authID);
    if (!Array.isArray(arr)) arr = [];
    const filtered = arr.filter(i => i !== item);
    await this.set(key, filtered, authID);
    console.log(`[Storage] removeFromArray "${key}" for ${authID}:`, filtered);
    return filtered;
  }

  async containsInArray(key, item, authID) {
    if (!authID) throw new Error("authID required for per-user arrays");
    let arr = await this.get(key, [], authID);
    if (!Array.isArray(arr)) arr = [];
    console.log(`[Storage] containsInArray "${key}" for ${authID}:`, arr.includes(item));
    return arr.includes(item);
  }

  async getAll() {
    return new Promise(resolve => {
      this.area.get(null, result => resolve(result));
    });
  }

  async resetAll() {
    return new Promise(resolve => {
      console.warn("[Storage] RESET ALL DATA");
      this.area.clear(() => {
        this.initDefaults().then(resolve);
      });
    });
  }
}