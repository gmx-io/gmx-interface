import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";

import { getSharedLanguagePreference, saveSharedLanguagePreference } from "./languagePreference";

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
    document.cookie = "gmx-language=; Path=/; Max-Age=0";
    window.history.replaceState({}, "", "/");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
    vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
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
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-AT"]);
    localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, "es");
    const i18n = await start();
    expect(i18n.locale).toBe("es");
    expect(i18n.messages.greeting).toBe("Hola");
  });

  it("activates and remembers the browser language on the first visit", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es-MX"]);
    const i18n = await start();
    expect(i18n.locale).toBe("es");
    expect(i18n.messages.greeting).toBe("Hola");
    expect(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY)).toBe("es");

    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-AT"]);
    expect((await start()).locale).toBe("es");
  });

  it("gives a shared language link priority over the saved and browser languages", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-AT"]);
    localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, "fr");
    window.history.replaceState({}, "", "/trade?lang=es");

    const i18n = await start();
    expect(i18n.locale).toBe("es");
    expect(i18n.messages.greeting).toBe("Hola");
    expect(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY)).toBe("es");

    window.history.replaceState({}, "", "/trade");
    expect((await start()).locale).toBe("es");
  });

  it("ignores an unsupported language link", async () => {
    localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, "es");
    window.history.replaceState({}, "", "/?lang=pt");
    expect((await start()).locale).toBe("es");
  });

  it("remembers the English fallback for an unsupported browser language", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["pt-BR", "es"]);
    expect((await start()).locale).toBe("en");
    expect(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY)).toBe("en");
  });

  it("reuses the landing page's detected language without detecting again in the app", async () => {
    saveSharedLanguagePreference({ locale: "es", source: "browser" });
    const browserLanguages = vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-AT"]);

    expect((await start()).locale).toBe("es");
    expect(browserLanguages).not.toHaveBeenCalled();
    expect(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY)).toBe("es");
    expect(getSharedLanguagePreference()).toEqual({ locale: "es", source: "browser" });
  });

  it("preserves an existing app choice over a language detected on the landing page", async () => {
    localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, "es");
    saveSharedLanguagePreference({ locale: "fr", source: "browser" });

    expect((await start()).locale).toBe("es");
    expect(getSharedLanguagePreference()).toEqual({ locale: "es", source: "user" });
  });

  it("uses the latest explicit choice from either frontend", async () => {
    localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, "fr");
    saveSharedLanguagePreference({ locale: "es", source: "user" });

    expect((await start()).locale).toBe("es");
    expect(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY)).toBe("es");
  });

  it("gives language links priority over the shared preference", async () => {
    saveSharedLanguagePreference({ locale: "fr", source: "user" });
    window.history.replaceState({}, "", "/?lang=es");

    expect((await start()).locale).toBe("es");
    expect(getSharedLanguagePreference()).toEqual({ locale: "es", source: "user" });
  });

  it("ignores unsupported shared preferences", async () => {
    saveSharedLanguagePreference({ locale: "invalid", source: "user" });
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es-MX"]);
    expect((await start()).locale).toBe("es");
  });

  it("keeps language switching available when cookies are blocked", async () => {
    vi.spyOn(document, "cookie", "get").mockImplementation(() => {
      throw new DOMException("Cookies denied", "SecurityError");
    });
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {
      throw new DOMException("Cookies denied", "SecurityError");
    });
    const { dynamicActivate } = await import("./i18n");
    await dynamicActivate("es");
    expect((await start()).locale).toBe("es");
    expect(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY)).toBe("es");
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
    const { initializeI18n } = await import("./i18n");
    const { i18n } = await import("@lingui/core");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es-MX"]);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });
    await initializeI18n();
    expect(i18n.locale).toBe("es");
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

describe("browser language detection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["en-US", "en"],
    ["es", "es"],
    ["es-MX", "es"],
    ["de-AT", "de"],
    ["fr-CA", "fr"],
    ["ko-KR", "ko"],
    ["ru-RU", "ru"],
    ["ja-JP", "ja"],
    ["zh", "zh"],
    ["zh-CN", "zh"],
    ["zh-SG", "zh"],
    ["zh-TW", "zh-tw"],
    ["zh-HK", "zh-tw"],
    ["zh-MO", "zh-tw"],
    ["zh-Hant", "zh-tw"],
    ["zh-Hans", "zh"],
    ["zh-Hant-CN", "zh-tw"],
    ["zh-Hans-TW", "zh"],
    ["ZH-hAnT-hk", "zh-tw"],
    ["pt-BR", "en"],
    ["tr-TR", "en"],
    ["ar", "en"],
    ["pseudo", "en"],
    ["", "en"],
  ])("resolves %s to %s", async (language, expected) => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue([language]);
    vi.spyOn(navigator, "language", "get").mockReturnValue(language);
    const { getBrowserLocale } = await import("./i18n");
    expect(getBrowserLocale()).toBe(expected);
  });

  it("uses navigator.language when the browser preference list is empty", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue([]);
    vi.spyOn(navigator, "language", "get").mockReturnValue("de-AT");
    const { getBrowserLocale } = await import("./i18n");
    expect(getBrowserLocale()).toBe("de");
  });
});
