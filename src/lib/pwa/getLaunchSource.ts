import type { DisplayMode } from "./getDisplayMode";

export type LaunchSource = "appIcon" | "appShortcut" | "web";

export function getLaunchSource(displayMode: DisplayMode): LaunchSource {
  if (typeof window === "undefined" || displayMode !== "standalone") {
    return "web";
  }

  const source = new URLSearchParams(window.location.search).get("source");

  if (source === "pwa") {
    return "appIcon";
  }

  if (source === "pwa-shortcut") {
    return "appShortcut";
  }

  return "web";
}
