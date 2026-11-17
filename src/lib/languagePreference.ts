const LANGUAGE_COOKIE_KEY = "gmx-language";

export type LanguagePreference = {
  locale: string;
  source: "browser" | "user";
};

export function getSharedLanguagePreference(): LanguagePreference | undefined {
  try {
    const value = document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${LANGUAGE_COOKIE_KEY}=`))
      ?.slice(LANGUAGE_COOKIE_KEY.length + 1);
    if (!value) {
      return undefined;
    }

    const preference = JSON.parse(decodeURIComponent(value));
    if (typeof preference?.locale === "string" && (preference.source === "browser" || preference.source === "user")) {
      return preference;
    }
  } catch {
    // Ignore unavailable or malformed shared preferences.
  }
}

export function saveSharedLanguagePreference(preference: LanguagePreference) {
  const { hostname, protocol } = window.location;
  const domain = hostname === "gmx.io" || hostname.endsWith(".gmx.io") ? "; Domain=gmx.io" : "";
  const secure = protocol === "https:" ? "; Secure" : "";

  try {
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${encodeURIComponent(JSON.stringify(preference))}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${secure}`;
  } catch {
    // Saving the shared preference must not prevent language activation.
  }
}
