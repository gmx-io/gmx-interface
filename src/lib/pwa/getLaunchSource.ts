export type LaunchSource = "appIcon" | "appShortcut" | "web";

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
    launchSource = "web";
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
