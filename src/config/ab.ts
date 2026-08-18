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
  // a flag rolls once per browser, so this ships at its target share — raising it later moves nobody
  gmxRelay: 0.3,
};

// rolled on first use instead of at load, so the split is over the population the experiment is
// about (browsers that actually send through a relay), not over every visitor
const LAZY_AB_FLAGS: ReadonlySet<AbFlag> = new Set(["gmxRelay"] as const);

export type AbFlag = keyof typeof abFlagsConfig;

const flags: AbFlag[] = Object.keys(abFlagsConfig) as AbFlag[];

let abStorage: AbStorage;

function rollAbFlag(flag: AbFlag): AbFlagValue {
  return { enabled: Math.random() < abFlagsConfig[flag] };
}

function initAbStorage() {
  abStorage = {} as AbStorage;

  for (const flag of flags) {
    if (LAZY_AB_FLAGS.has(flag)) {
      continue;
    }

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

      for (const flag of flags) {
        if (!abStorage[flag]) {
          if (LAZY_AB_FLAGS.has(flag)) {
            continue;
          }

          abStorage[flag] = rollAbFlag(flag);
          changed = true;
        } else if (abFlagsConfig[flag] === 1 && !abStorage[flag].enabled) {
          abStorage[flag] = { enabled: true };
          changed = true;
        }
      }

      for (const flag of Object.keys(abStorage)) {
        if (!flags.includes(flag as AbFlag)) {
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

/** Rolls a lazy flag at its moment of first use; a passive read elsewhere never assigns. */
export function ensureAbFlagRolled(flag: AbFlag): boolean {
  if (!abStorage[flag]) {
    abStorage[flag] = rollAbFlag(flag);
    localStorage.setItem(AB_FLAG_STORAGE_KEY, JSON.stringify(abStorage));
  }

  return abStorage[flag].enabled;
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
