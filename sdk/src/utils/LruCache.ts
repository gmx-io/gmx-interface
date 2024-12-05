export class LRUCache<T> {
  private capacity: number;
  private cache: Map<string, T>;
  private recentKeys: string[];

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<string, T>();
    this.recentKeys = [];
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  get(key: string): T | undefined {
    if (this.cache.has(key)) {
      // Update recentKeys to reflect the usage
      this.updateRecentKeys(key);
      return this.cache.get(key);
    }
    return undefined;
  }

  set(key: string, value: T): void {
    if (typeof key !== "string") {
      throw new Error("Key must be a string");
    }

    // If key exists, update its value and move it to the front of recentKeys
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      this.updateRecentKeys(key);
    } else {
      // If capacity is reached, remove least recently used item
      if (this.cache.size === this.capacity) {
        const lruKey = this.recentKeys.shift();
        if (lruKey) {
          this.cache.delete(lruKey);
        }
      }
      // Add the new key-value pair to the cache and recentKeys
      this.cache.set(key, value);
      this.recentKeys.push(key);
    }
  }

  private updateRecentKeys(key: string): void {
    // Move the key to the end (most recently used) of recentKeys
    this.recentKeys = this.recentKeys.filter((k) => k !== key);
    this.recentKeys.push(key);
  }
}
