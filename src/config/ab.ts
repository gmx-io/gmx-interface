import mapValues from "lodash/mapValues";

import { BASIS_POINTS_DIVISOR_BIGINT } from "./factors";
import { AB_FLAG_STORAGE_KEY } from "./localStorage";

type AbFlagValue = {
  enabled: boolean;
};

type AbStorage = {
  [key in AbFlag]: AbFlagValue;
};

const abFlagsConfig = {
  abSdk3: 0,
  useTestApi: 0,
};


export type AbFlag = keyof typeof abFlagsConfig;

// the configured flags, not the assigned ones: a lazy flag exists here before any browser holds it
export const AB_FLAG_NAMES = Object.keys(abFlagsConfig) as readonly AbFlag[];

let abStorage: AbStorage;

function rollAbFlag(flag: AbFlag): AbFlagValue {
  return { enabled: Math.random() < abFlagsConfig[flag] };
}

function initAbStorage() {
  abStorage = {} as AbStorage;

  for (const flag of AB_FLAG_NAMES) {
    abStorage[flag] = rollAbFlag(flag);
  }

  localStorage.setItem(AB_FLAG_STORAGE_KEY, JSON.stringify(abStorage));
}

function loadAbStorage(): void {
  const rawAbStorage = localStorage.getItem(AB_FLAG_STORAGE_KEY);

  if (rawAbStorage === null) {
    initAbStorage();
  } else {
    try {
      abStorage = JSON.parse(rawAbStorage);

      let changed = false;

      for (const flag of AB_FLAG_NAMES) {
        if (!abStorage[flag]) {
          abStorage[flag] = rollAbFlag(flag);
          changed = true;
        } else if (abFlagsConfig[flag] === 1 && !abStorage[flag].enabled) {
          abStorage[flag] = { enabled: true };
          changed = true;
        }
      }

      for (const flag of Object.keys(abStorage)) {
        if (!AB_FLAG_NAMES.includes(flag as AbFlag)) {
          // @ts-ignore
          delete abStorage[flag];
          changed = true;
        }
      }

      if (changed) {
        localStorage.setItem(AB_FLAG_STORAGE_KEY, JSON.stringify(abStorage));
      }
    } catch (error) {
      initAbStorage();
    }
  }
}

loadAbStorage();

export function getAbStorage() {
  return abStorage;
}

export function setAbFlagEnabled(flag: AbFlag, enabled: boolean) {
  abStorage[flag] = {
    enabled,
  };

  localStorage.setItem(AB_FLAG_STORAGE_KEY, JSON.stringify(abStorage));
}

export function getIsFlagEnabled(flag: AbFlag): boolean {
  return Boolean(abStorage[flag]?.enabled);
}


export function getAbFlags(): Record<AbFlag, boolean> {
  return mapValues(abStorage, ({ enabled }) => enabled);
}

export function getAbFlagUrlParams(): string {
  return Object.entries(abStorage)
    .map(([flag, { enabled }]) => `${flag}=${enabled ? 1 : 0}`)
    .join("&");
}

// Config for deterministic ab flags based on address

export const AB_HIGH_LEVERAGE_WARNING_GROUP = "alert-high-leverage";
export const AB_HIGH_LEVERAGE_WARNING_PROBABILITY = 0.5;
export const AB_HIGH_LEVERAGE_WARNING_MAJOR_TOKEN_LEVERAGE = 15n * BASIS_POINTS_DIVISOR_BIGINT;
export const AB_HIGH_LEVERAGE_WARNING_ALTCOIN_LEVERAGE = 10n * BASIS_POINTS_DIVISOR_BIGINT;
