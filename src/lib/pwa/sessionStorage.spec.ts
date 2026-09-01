import { describe, expect, it, vi } from "vitest";

import { getCanUseSessionStorage } from "./sessionStorage";

describe("getCanUseSessionStorage", () => {
  it("verifies storage with a temporary value", () => {
    expect(getCanUseSessionStorage(window.sessionStorage)).toBe(true);
    expect(window.sessionStorage.getItem("gmx-pwa-storage-test")).toBeNull();
  });

  it("rejects missing, unwritable, and unreadable storage", () => {
    const sessionStorageSpy = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });
    try {
      expect(getCanUseSessionStorage()).toBe(false);
    } finally {
      sessionStorageSpy.mockRestore();
    }

    expect(
      getCanUseSessionStorage({
        setItem: () => {
          throw new DOMException("Access denied", "SecurityError");
        },
        getItem: () => null,
        removeItem: () => undefined,
      } as unknown as Storage)
    ).toBe(false);
    expect(
      getCanUseSessionStorage({
        setItem: () => undefined,
        getItem: () => null,
        removeItem: () => undefined,
      } as unknown as Storage)
    ).toBe(false);
  });
});
