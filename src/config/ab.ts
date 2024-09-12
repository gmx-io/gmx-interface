import mapValues from "lodash/mapValues";
import { AB_FLAG_STORAGE_KEY } from "./localStorage";

type Flag = "testAdjustRpcBatching" | "testPrebuiltMarkets";

type AbFlag = {
  enabled: boolean;
};

type AbStorage = {
  [key in Flag]: AbFlag;
};

const abFlagsConfig: Record<Flag, number> = {
  testAdjustRpcBatching: 0.5,
  testPrebuiltMarkets: 0.5,
};

const flags: Flag[] = Object.keys(abFlagsConfig) as Flag[];

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
        if (!flags.includes(flag as Flag)) {
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

export function getIsFlagEnabled(flag: Flag): boolean {
  return Boolean(abStorage[flag]?.enabled);
}

export function getAbFlags(): Record<Flag, boolean> {
  return mapValues(abStorage, ({ enabled }) => enabled);
}
