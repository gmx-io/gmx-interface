export const supportedResolutions = { 5: "5m", 15: "15m", 60: "1h", 240: "4h", "1D": "1d" };
export const LAST_BAR_REFRESH_INTERVAL = 15000; // 15 seconds

export function getPeriodFromResolutions(value, object = supportedResolutions) {
  return Object.keys(object).find((key) => object[key] === value);
}

export function formatTimeInBar(bar) {
  return {
    ...bar,
    time: bar.time * 1000,
  };
}
