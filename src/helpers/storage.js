export class Storage {
  static isContextAlive() {
    try {
      return !!chrome?.runtime?.id;
    } catch {
      return false;
    }
  }

  constructor(area = chrome.storage.local) {
    this.area = area;

    this.DEFAULTS = {
      hideFriendStatus: false,
      removeConnectButton: true,
      renameConnectionsToFriends: true,
      celerbateUsersBirthday: true,
      homeGreeting: "{greeting}, {displayName}!",
    };

    this.PER_USER_KEYS = ["bestFriends"];
  }

  isPerUserKey(key) {
    return this.PER_USER_KEYS.includes(key);
  }

  initDefaults() {
    return new Promise(resolve => {
      if (!Storage.isContextAlive()) return resolve();

      this.area.get(null, current => {
        if (!Storage.isContextAlive()) return resolve();

        try {
          const toSet = {};

          for (const key in this.DEFAULTS) {
            const def = this.DEFAULTS[key];
            const cur = current[key];

            const isMissing = !(key in current);
            const isBroken =
              cur === null ||
              cur === undefined ||
              (Array.isArray(def) && !Array.isArray(cur)) ||
              (typeof def === "object" &&
                !Array.isArray(def) &&
                typeof cur !== "object");

            if (isMissing || isBroken) {
              toSet[key] = structuredClone(def);
            }
          }

          Object.keys(toSet).length
            ? this.area.set(toSet, resolve)
            : resolve();
        } catch {
          resolve();
        }
      });
    });
  }

  get(key, fallback, authID) {
    return new Promise(resolve => {
      if (!Storage.isContextAlive()) {
        resolve(fallback ?? this.DEFAULTS[key]);
        return;
      }

      this.area.get(null, result => {
        if (!Storage.isContextAlive()) {
          resolve(fallback ?? this.DEFAULTS[key]);
          return;
        }

        try {
          let value;

          if (authID && this.isPerUserKey(key)) {
            const userObj = result[authID] || {};
            value = userObj[key];
            if (value === undefined) value = fallback ?? [];
            if (Array.isArray(fallback) && !Array.isArray(value)) value = [];
          } else {
            value = result[key] ?? fallback ?? this.DEFAULTS[key];
          }

          resolve(value);
        } catch {
          resolve(fallback ?? this.DEFAULTS[key]);
        }
      });
    });
  }

  set(key, value, authID) {
    return new Promise(resolve => {
      if (!Storage.isContextAlive()) return resolve();

      this.area.get(null, result => {
        if (!Storage.isContextAlive()) return resolve();

        try {
          if (authID && this.isPerUserKey(key)) {
            const userObj = result[authID] || {};
            userObj[key] = Array.isArray(value) ? value : [];
            this.area.set({ [authID]: userObj }, resolve);
          } else {
            this.area.set({ [key]: value }, resolve);
          }
        } catch {
          resolve();
        }
      });
    });
  }

  async addToArray(key, item, authID) {
    if (!authID) return [];
    const arr = await this.get(key, [], authID);
    if (!Array.isArray(arr)) return [];
    if (!arr.includes(item)) {
      arr.push(item);
      await this.set(key, arr, authID);
    }
    return arr;
  }

  async removeFromArray(key, item, authID) {
    if (!authID) return [];
    const arr = await this.get(key, [], authID);
    if (!Array.isArray(arr)) return [];
    const filtered = arr.filter(i => i !== item);
    await this.set(key, filtered, authID);
    return filtered;
  }

  async containsInArray(key, item, authID) {
    if (!authID) return false;
    const arr = await this.get(key, [], authID);
    if (!Array.isArray(arr)) return false;
    return arr.includes(item);
  }

  getAll() {
    return new Promise(resolve => {
      if (!Storage.isContextAlive()) return resolve({});
      this.area.get(null, result => resolve(result ?? {}));
    });
  }

  resetAll() {
    return new Promise(resolve => {
      if (!Storage.isContextAlive()) return resolve();
      this.area.clear(() => this.initDefaults().then(resolve));
    });
  }
}