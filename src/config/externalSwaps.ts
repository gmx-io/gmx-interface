import { deserializeBigIntsInObject, serializeBigIntsInObject } from "lib/numbers";
import { AVALANCHE, MEGAETH } from "sdk/configs/chains";

import { ARBITRUM } from "./chains";
import { isDevelopment } from "./env";
import { DEBUG_SWAP_SETTINGS_KEY } from "./localStorage";

// Enable external swap if price impact delta is less than this threshold
export const SWAP_PRICE_IMPACT_FOR_EXTERNAL_SWAP_THRESHOLD_BPS = -15n;

export const HIGH_EXTERNAL_SWAP_FEES_BPS = 200; // 2%

let isSwapDebugSettingsInited = false;

let swapDebugSettings = {
  swapPriceImpactForExternalSwapThresholdBps: SWAP_PRICE_IMPACT_FOR_EXTERNAL_SWAP_THRESHOLD_BPS,
  forceExternalSwaps: false,
  failExternalSwaps: false,
};

const KYBER_SWAP_BASE_URL = "https://aggregator-api.kyberswap.com";
export const KYBER_SWAP_CLIENT_ID = "gmx5326";

const KYBER_SWAP_CHAIN_PATH: Record<number, string> = {
  [ARBITRUM]: "arbitrum",
  [AVALANCHE]: "avalanche",
  [MEGAETH]: "megaeth",
};

export const EXCLUDED_KYBER_SWAP_SOURCES: Record<number, string[]> = {
  [ARBITRUM]: ["gmx"],
  [AVALANCHE]: ["gmx"],
  [MEGAETH]: ["gmx"],
};

export function getKyberSwapUrl(chainId: number) {
  const chainPath = KYBER_SWAP_CHAIN_PATH[chainId];

  if (!chainPath) {
    throw new Error("Unsupported KyberSwap network");
  }

  return `${KYBER_SWAP_BASE_URL}/${chainPath}`;
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
      swapDebugSettings = deserializeBigIntsInObject(JSON.parse(stored)) as typeof swapDebugSettings;
    } else {
      localStorage.setItem(DEBUG_SWAP_SETTINGS_KEY, JSON.stringify(serializeBigIntsInObject(swapDebugSettings)));
    }

    isSwapDebugSettingsInited = true;
  }

  return swapDebugSettings;
}
