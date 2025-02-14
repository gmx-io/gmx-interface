import { AVALANCHE } from "sdk/configs/chains";
import { ARBITRUM } from "./chains";
import { isDevelopment } from "./env";
import { DEBUG_SWAP_SETTINGS_KEY } from "./localStorage";

// Enable external swap if price impact delta is less than this threshold
export const SWAP_PRICE_IMPACT_FOR_EXTERNAL_SWAP_THRESHOLD_BPS = -1500n;

// Enable auto swap fallback if fees difference of internal and external swap are less than this threshold
export const AUTO_SWAP_FALLBACK_MAX_FEES_BPS = -10n;

// Disable external swap aggregator if this number of build transactions fail
export const DISABLE_EXTERNAL_SWAP_AGGREGATOR_FAILS_COUNT = 3;

let isSwapDebugSettingsInited = false;
let swapDebugSettings = {
  swapPriceImpactForExternalSwapThresholdBps: SWAP_PRICE_IMPACT_FOR_EXTERNAL_SWAP_THRESHOLD_BPS,
  autoSwapFallbackMaxFeesBps: AUTO_SWAP_FALLBACK_MAX_FEES_BPS,
  forceExternalSwaps: false,
};

const OPEN_OCEAN_BASE_URL = "https://open-api.openocean.finance/v3";
export const OPEN_OCEAN_REFERRER = "0xC539cB358a58aC67185BaAD4d5E3f7fCfc903700";

const OPEN_OCEAN_API_URL = {
  [ARBITRUM]: `${OPEN_OCEAN_BASE_URL}/arbitrum`,
  [AVALANCHE]: `${OPEN_OCEAN_BASE_URL}/avax`,
};

export const DISABLED_OPEN_OCEAN_DEXES = {
  /**
   *  @see https://open-api.openocean.finance/v3/arbitrum/dexList
   */
  [ARBITRUM]: [8, 54],
  /**
   *  @see https://open-api.openocean.finance/v3/avax/dexList
   */
  [AVALANCHE]: [
    18, // GMX
  ],
};

export function getOpenOceanUrl(chainId: number) {
  const url = OPEN_OCEAN_API_URL[chainId];

  if (!url) {
    throw new Error("Unsupported open ocean network");
  }

  return url;
}

export function setSwapDebugSetting<K extends keyof typeof swapDebugSettings>(
  key: K,
  value: (typeof swapDebugSettings)[K]
) {
  if (!isDevelopment()) {
    return;
  }

  swapDebugSettings[key] = value;
  localStorage.setItem(DEBUG_SWAP_SETTINGS_KEY, JSON.stringify(swapDebugSettings));
}

export function getSwapPriceImpactForExternalSwapThresholdBps() {
  const swapDebugSettings = getSwapDebugSettings();

  return (
    swapDebugSettings?.swapPriceImpactForExternalSwapThresholdBps || SWAP_PRICE_IMPACT_FOR_EXTERNAL_SWAP_THRESHOLD_BPS
  );
}

export function getSwapDebugSettings() {
  if (!isDevelopment()) {
    return undefined;
  }

  if (!isSwapDebugSettingsInited) {
    const stored = localStorage.getItem(DEBUG_SWAP_SETTINGS_KEY);

    // use stored or store defaults
    if (stored) {
      swapDebugSettings = JSON.parse(stored);
    } else {
      localStorage.setItem(DEBUG_SWAP_SETTINGS_KEY, JSON.stringify(swapDebugSettings));
    }

    isSwapDebugSettingsInited = true;
  }

  return swapDebugSettings;
}
