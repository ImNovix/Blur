export class Storage {
  constructor(area = chrome.storage.local) {
    this.area = area;
    this.DEFAULTS = {
      hideFriendStatus: false,
      removeConnectButton: true,
      renameConnectionsToFriends: true,
      homeGreeting: "{greeting}, {displayName}!",
      bestFriends: [],
    };
  }

  /** Initialize storage with defaults (non-destructive) */
  initDefaults() {
    return new Promise(resolve => {
      this.area.get(null, current => {
        const toSet = {};
        for (const key in this.DEFAULTS) {
          if (!(key in current)) {
            toSet[key] = this.DEFAULTS[key];
          }
        }
        if (Object.keys(toSet).length > 0) {
          this.area.set(toSet, resolve);
        } else {
          resolve();
        }
      });
    });
  }

  /** Get a value */
  get(key, fallback) {
    if (fallback === undefined) fallback = this.DEFAULTS[key];
    return new Promise(resolve => {
      this.area.get([key], result => {
        resolve(result[key] ?? fallback);
      });
    });
  }

  /** Set a value */
  set(key, value) {
    return new Promise(resolve => {
      this.area.set({ [key]: value }, resolve);
    });
  }

  /** Toggle a boolean */
  async toggle(key) {
    const current = await this.get(key);
    const next = !current;
    await this.set(key, next);
    return next;
  }

  /** Add an item to an array key */
  async addToArray(key, item) {
    const arr = await this.get(key, []);
    if (!arr.includes(item)) {
      arr.push(item);
      await this.set(key, arr);
    }
    return arr;
  }

  /** Remove an item from an array key */
  async removeFromArray(key, item) {
    const arr = await this.get(key, []);
    const filtered = arr.filter(i => i !== item);
    await this.set(key, filtered);
    return filtered;
  }

  async containsInArray(key, item) {
    const arr = await this.get(key, []);
    return arr.includes(item);
  }
}
