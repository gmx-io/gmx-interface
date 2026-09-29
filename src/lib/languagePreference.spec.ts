import { afterEach, describe, expect, it, vi } from "vitest";

import { getSharedLanguagePreference, saveSharedLanguagePreference } from "./languagePreference";

describe("shared language preference", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(["gmx.io", "app.gmx.io"])("shares the language across GMX subdomains from %s", (hostname) => {
    vi.stubGlobal("window", { location: new URL(`https://${hostname}`) });
    const setCookie = vi.spyOn(document, "cookie", "set").mockImplementation(vi.fn());

    saveSharedLanguagePreference({ locale: "de", source: "browser" });

    expect(setCookie).toHaveBeenCalledWith(expect.stringContaining("; Domain=gmx.io"));
    expect(setCookie).toHaveBeenCalledWith(expect.stringContaining("; Path=/; Max-Age=31536000; SameSite=Lax"));
    expect(setCookie).toHaveBeenCalledWith(expect.stringContaining("; Secure"));
  });

  it.each(["localhost", "preview.netlify.app", "gmx.io.example.com"])(
    "keeps the preference local on %s",
    (hostname) => {
      vi.stubGlobal("window", { location: new URL(`http://${hostname}`) });
      const setCookie = vi.spyOn(document, "cookie", "set").mockImplementation(vi.fn());

      saveSharedLanguagePreference({ locale: "es", source: "user" });

      expect(setCookie).toHaveBeenCalledOnce();
      expect(setCookie).not.toHaveBeenCalledWith(expect.stringContaining("Domain="));
      expect(setCookie).not.toHaveBeenCalledWith(expect.stringContaining("Secure"));
    }
  );

  it.each(["%invalid", "null", '{"locale":"es","source":"invalid"}'])("ignores malformed cookie %s", (value) => {
    vi.spyOn(document, "cookie", "get").mockReturnValue(`other=value; gmx-language=${value}`);
    expect(getSharedLanguagePreference()).toBeUndefined();
  });
});
