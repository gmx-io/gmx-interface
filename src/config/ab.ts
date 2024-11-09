import mapValues from "lodash/mapValues";
import { AB_FLAG_STORAGE_KEY } from "./localStorage";

type AbFlagValue = {
  enabled: boolean;
};

type AbStorage = {
  [key in AbFlag]: AbFlagValue;
};

const abFlagsConfig = {
  // testExampleAb: 0.5,
  testParallelSimulation: 0.5,
  testWebsocketBalances: 0.3,
};

export type AbFlag = keyof typeof abFlagsConfig;

const flags: AbFlag[] = Object.keys(abFlagsConfig) as AbFlag[];

let abStorage: AbStorage;

function initAbStorage() {
  abStorage = {} as AbStorage;

  for (const flag of flags) {
    abStorage[flag] = {
      enabled: Math.random() < abFlagsConfig[flag],
    };
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
          abStorage[flag] = {
            enabled: Math.random() < abFlagsConfig[flag],
          };
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
    } catch {
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
