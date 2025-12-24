import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Storage } from "../Storage";

type TestState = {
  flag1: boolean;
  flag2: boolean;
  count: number;
  message: string;
};

describe("Storage", () => {
  const TEST_STORAGE_KEY = "test-storage-key";

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("constructor", () => {
    it("should initialize with empty state when localStorage is empty", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      expect(storage.getState()).toEqual({});
    });

    it("should load existing state from localStorage", () => {
      const existingState = { flag1: true, count: 42 };
      localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(existingState));

      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      expect(storage.getState()).toEqual(existingState);
    });

    it("should handle invalid JSON in localStorage gracefully", () => {
      localStorage.setItem(TEST_STORAGE_KEY, "invalid-json");

      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      expect(storage.getState()).toEqual({});
    });

    it("should handle missing localStorage key gracefully", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      expect(storage.getState()).toEqual({});
    });
  });

  describe("get", () => {
    it("should return undefined for non-existent key", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      expect(storage.get("flag1")).toBeUndefined();
    });

    it("should return value for existing key", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      storage.set("flag1", true);
      expect(storage.get("flag1")).toBe(true);
    });

    it("should return correct type for different value types", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      storage.set("flag1", true);
      storage.set("count", 42);
      storage.set("message", "test");

      expect(storage.get("flag1")).toBe(true);
      expect(storage.get("count")).toBe(42);
      expect(storage.get("message")).toBe("test");
    });

    it("should return value loaded from localStorage", () => {
      const existingState = { flag1: true, count: 100 };
      localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(existingState));

      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      expect(storage.get("flag1")).toBe(true);
      expect(storage.get("count")).toBe(100);
    });
  });

  describe("set", () => {
    it("should save value to localStorage", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      storage.set("flag1", true);

      const stored = localStorage.getItem(TEST_STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.flag1).toBe(true);
    });

    it("should update existing value", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      storage.set("flag1", false);
      storage.set("flag1", true);

      expect(storage.get("flag1")).toBe(true);
      const stored = JSON.parse(localStorage.getItem(TEST_STORAGE_KEY)!);
      expect(stored.flag1).toBe(true);
    });

    it("should save multiple values", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      storage.set("flag1", true);
      storage.set("flag2", false);
      storage.set("count", 42);

      expect(storage.get("flag1")).toBe(true);
      expect(storage.get("flag2")).toBe(false);
      expect(storage.get("count")).toBe(42);

      const stored = JSON.parse(localStorage.getItem(TEST_STORAGE_KEY)!);
      expect(stored).toEqual({ flag1: true, flag2: false, count: 42 });
    });

    it("should handle localStorage.setItem errors gracefully", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      const setItemSpy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      // Should not throw
      expect(() => {
        storage.set("flag1", true);
      }).not.toThrow();

      setItemSpy.mockRestore();
    });

    it("should preserve other keys when updating one", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      storage.set("flag1", true);
      storage.set("count", 42);
      storage.set("flag2", false);

      expect(storage.get("flag1")).toBe(true);
      expect(storage.get("count")).toBe(42);
      expect(storage.get("flag2")).toBe(false);
    });
  });

  describe("getState", () => {
    it("should return current state object", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      storage.set("flag1", true);
      storage.set("count", 42);

      const state = storage.getState();
      expect(state).toEqual({ flag1: true, count: 42 });
    });

    it("should return empty object when no values set", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      expect(storage.getState()).toEqual({});
    });
  });

  describe("loadState", () => {
    it("should return empty object when localStorage is empty", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      const state = (storage as any).loadState();
      expect(state).toEqual({});
    });

    it("should parse valid JSON from localStorage", () => {
      const testData = { flag1: true, count: 42 };
      localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(testData));

      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      const state = (storage as any).loadState();
      expect(state).toEqual(testData);
    });

    it("should handle JSON.parse errors gracefully", () => {
      localStorage.setItem(TEST_STORAGE_KEY, "invalid-json");

      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      const state = (storage as any).loadState();
      expect(state).toEqual({});
    });

    it("should handle localStorage.getItem errors gracefully", () => {
      const getItemSpy = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
        throw new Error("Storage error");
      });

      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      const state = (storage as any).loadState();
      expect(state).toEqual({});

      getItemSpy.mockRestore();
    });
  });

  describe("saveState", () => {
    it("should save state to localStorage", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      (storage as any).state = { flag1: true, count: 42 };
      (storage as any).saveState();

      const stored = localStorage.getItem(TEST_STORAGE_KEY);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual({ flag1: true, count: 42 });
    });

    it("should handle localStorage.setItem errors gracefully", () => {
      const storage = new Storage<TestState>(TEST_STORAGE_KEY);
      (storage as any).state = { flag1: true };

      const setItemSpy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      // Should not throw
      expect(() => {
        (storage as any).saveState();
      }).not.toThrow();

      setItemSpy.mockRestore();
    });
  });

  describe("integration", () => {
    it("should persist state across multiple Storage instances with same key", () => {
      const storage1 = new Storage<TestState>(TEST_STORAGE_KEY);
      storage1.set("flag1", true);
      storage1.set("count", 42);

      const storage2 = new Storage<TestState>(TEST_STORAGE_KEY);
      expect(storage2.get("flag1")).toBe(true);
      expect(storage2.get("count")).toBe(42);
    });

    it("should isolate state for different storage keys", () => {
      const storage1 = new Storage<TestState>("key1");
      const storage2 = new Storage<TestState>("key2");

      storage1.set("flag1", true);
      storage2.set("flag1", false);

      expect(storage1.get("flag1")).toBe(true);
      expect(storage2.get("flag1")).toBe(false);
    });

    it("should handle complex nested objects", () => {
      type ComplexState = {
        nested: {
          value: number;
          items: string[];
        };
      };

      const storage = new Storage<ComplexState>(TEST_STORAGE_KEY);
      const complexValue = { nested: { value: 42, items: ["a", "b", "c"] } };
      storage.set("nested", complexValue.nested);

      const stored = JSON.parse(localStorage.getItem(TEST_STORAGE_KEY)!);
      expect(stored.nested).toEqual({ value: 42, items: ["a", "b", "c"] });
    });

    it("should handle null and undefined values", () => {
      type NullableState = {
        nullable: string | null;
        optional?: string;
      };

      const storage = new Storage<NullableState>(TEST_STORAGE_KEY);
      storage.set("nullable", null);

      // Note: JSON.stringify converts undefined to omitting the key
      // and null stays as null
      const stored = JSON.parse(localStorage.getItem(TEST_STORAGE_KEY)!);
      expect(stored.nullable).toBeNull();
      expect(stored.optional).toBeUndefined();
    });
  });
});
