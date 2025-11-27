export class LRUCache<T> {
  private capacity: number;
  private cache: Map<string, T>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<string, T>();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  get(key: string): T | undefined {
    if (this.cache.has(key)) {
      // Move to end (most recently used) by deleting and re-inserting
      const value = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: string, value: T): void {
    if (typeof key !== "string") {
      throw new Error("Key must be a string");
    }

    if (this.cache.has(key)) {
      // Update existing key: delete and re-insert to move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    } else {
      // If capacity is 0, don't store anything
      if (this.capacity === 0) {
        return;
      }
      // If capacity is reached, remove least recently used (first entry)
      if (this.cache.size === this.capacity) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
          this.cache.delete(firstKey);
        }
      }
      // Add the new key-value pair (inserted at end = most recently used)
      this.cache.set(key, value);
    }
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  clean(): void {
    this.cache.clear();
  }
}
