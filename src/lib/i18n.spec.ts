import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";

const { reportStartupError } = vi.hoisted(() => ({ reportStartupError: vi.fn() }));

vi.mock("lib/metrics/startupErrors", () => ({ reportStartupError }));
vi.mock("locales/en/messages.po", () => ({ messages: { greeting: "Hello" } }));
vi.mock("locales/es/messages.po", () => ({ messages: { greeting: "Hola" } }));
vi.mock("locales/fr/messages.po", () => {
  throw new TypeError("Importing a module script failed");
});

describe("language startup", () => {
  beforeEach(() => {
    vi.resetModules();
    reportStartupError.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function start() {
    const { initializeI18n } = await import("./i18n");
    const { i18n } = await import("@lingui/core");
    await initializeI18n();
    return i18n;
  }

  it("activates the saved language before startup completes", async () => {
    localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, "es");
    const i18n = await start();
    expect(i18n.locale).toBe("es");
    expect(i18n.messages.greeting).toBe("Hola");
  });

  it("falls back to bundled English when the saved language cannot load", async () => {
    localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, "fr");
    const i18n = await start();
    expect(i18n.locale).toBe("en");
    expect(i18n.messages.greeting).toBe("Hello");
    expect(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY)).toBe("fr");
    expect(reportStartupError).toHaveBeenCalledWith(expect.any(Error), "app.i18n");
  });

  it("uses English for an invalid saved language", async () => {
    localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, "invalid");
    expect((await start()).locale).toBe("en");
  });

  it("starts when reading the language preference throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });
    expect((await start()).locale).toBe("en");
  });

  it("activates the catalog even when saving the language preference throws", async () => {
    localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, "es");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage full", "QuotaExceededError");
    });
    const i18n = await start();
    expect(i18n.locale).toBe("es");
    expect(i18n.messages.greeting).toBe("Hola");
  });
});
