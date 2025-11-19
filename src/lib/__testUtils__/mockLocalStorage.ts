import { vi } from "vitest";

export function createLocalStorageMock(initialData: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initialData };

  const localStorageMock = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };

  // Replace global localStorage
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });

  return {
    store,
    mock: localStorageMock,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    getItem: (key: string) => store[key] ?? null,
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
  };
}
