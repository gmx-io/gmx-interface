import { NOTIFICATION_TYPE_SEARCH_PARAM, NOTIFICATION_WARM_TAP_SEARCH_PARAM } from "config/notifications";

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
    // The tap's parameters stay: the app reads and removes them once the router runs. A tap on an open app that needed
    // a reload did not launch it.
    const isNotificationLaunch =
      url.searchParams.has(NOTIFICATION_TYPE_SEARCH_PARAM) && !url.searchParams.has(NOTIFICATION_WARM_TAP_SEARCH_PARAM);
    launchSource = isNotificationLaunch ? "notification" : "web";
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
