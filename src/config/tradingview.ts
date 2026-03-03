export const SUPPORTED_RESOLUTIONS_V2 = {
  1: "1m",
  5: "5m",
  15: "15m",
  60: "1h",
  240: "4h",
  "1D": "1d",
  "1W": "1w",
  "1M": "1M",
};

export const RESOLUTION_TO_SECONDS: Record<string, number> = {
  1: 60,
  5: 60 * 5,
  15: 60 * 15,
  60: 60 * 60,
  240: 60 * 60 * 4,
  "1D": 60 * 60 * 24,
  "1W": 60 * 60 * 24 * 7,
  "1M": 60 * 60 * 24 * 30,
};
