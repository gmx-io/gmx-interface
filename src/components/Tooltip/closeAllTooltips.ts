const CLOSE_ALL_TOOLTIPS_EVENT = "gmx:close-all-tooltips";

let lastCloseAllTime = -Infinity;

export function closeAllTooltips() {
  lastCloseAllTime = performance.now();
  window.dispatchEvent(new Event(CLOSE_ALL_TOOLTIPS_EVENT));
}

export function subscribeToCloseAllTooltips(callback: () => void) {
  window.addEventListener(CLOSE_ALL_TOOLTIPS_EVENT, callback);
  return () => window.removeEventListener(CLOSE_ALL_TOOLTIPS_EVENT, callback);
}

export function wereTooltipsClosedSince(time: number) {
  return lastCloseAllTime >= time;
}
