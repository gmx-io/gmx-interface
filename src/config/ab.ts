import { AB_FLAG_STORAGE_KEY } from "./localStorage";

type Flag = "testWorkerLogic";

type AbFlag = {
  enabled: boolean;
};

type AbStorage = {
  [key in Flag]: AbFlag;
};

const RATIOS: Record<Flag, number> = {
  testWorkerLogic: 0.25,
};

const flags: Flag[] = ["testWorkerLogic"];

let flagTestWorkerLogic = localStorage.getItem(AB_FLAG_STORAGE_KEY);

let abStorage: AbStorage;

function initAbStorage() {
  abStorage = {} as AbStorage;

  for (const flag of flags) {
    abStorage[flag] = {
      enabled: Math.random() < RATIOS[flag],
    };
  }

  localStorage.setItem(AB_FLAG_STORAGE_KEY, JSON.stringify(abStorage));
}

if (flagTestWorkerLogic === null) {
  initAbStorage();
} else {
  try {
    abStorage = JSON.parse(flagTestWorkerLogic);

    let changed = false;

    for (const flag of flags) {
      if (!abStorage[flag]) {
        abStorage[flag] = {
          enabled: Math.random() < RATIOS[flag],
        };
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

export function getIsFlagEnabled(flag: Flag): boolean {
  return abStorage[flag].enabled;
}
