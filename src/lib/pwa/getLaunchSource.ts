import { NOTIFICATION_TYPE_SEARCH_PARAM } from "config/notifications";

export type LaunchSource = "appIcon" | "appShortcut" | "notification" | "web";

let launchSource: LaunchSource | undefined;

export function initializeLaunchSource() {
  if (typeof window === "undefined" || launchSource !== undefined) {
    return;
  }

  const url = new URL(window.location.href);
  const source = url.searchParams.get("source");

  if (source === "pwa") {
    launchSource = "appIcon";
  } else if (source === "pwa-shortcut") {
    launchSource = "appShortcut";
  } else {
    // The tap's parameters stay: the app reads and removes them once the router runs.
    launchSource = url.searchParams.has(NOTIFICATION_TYPE_SEARCH_PARAM) ? "notification" : "web";
    return;
  }

  url.searchParams.delete("source");

  try {
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // URL cleanup must not prevent the app from opening.
  }
}

export function getLaunchSource(): LaunchSource | undefined {
  return launchSource;
}
