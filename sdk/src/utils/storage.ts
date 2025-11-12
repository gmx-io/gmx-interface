import { LRUCache } from "./LruCache";

export type IStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  getItemJson<T>(key: string): T | null;
  setItemJson<T>(key: string, value: T): void;
};

export class MemoryStorage implements IStorage {
  private cache: LRUCache<string>;

  constructor() {
    this.cache = new LRUCache<string>(1000);
  }

  getItem(key: string) {
    return this.cache.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.cache.set(key, value);
  }

  getItemJson<T>(key: string): T | null {
    try {
      const item = this.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      return null;
    }
  }

  setItemJson<T>(key: string, value: T) {
    try {
      this.cache.set(key, JSON.stringify(value));
    } catch (error) {
      throw new Error(`Failed to set JSON item ${key} with value ${value}`);
    }
  }
}
