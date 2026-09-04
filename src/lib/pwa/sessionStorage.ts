const SESSION_STORAGE_TEST_KEY = "gmx-pwa-storage-test";

export function getSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function getCanUseSessionStorage(storage: Storage | undefined = getSessionStorage()) {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(SESSION_STORAGE_TEST_KEY, "1");
    const canUseStorage = storage.getItem(SESSION_STORAGE_TEST_KEY) === "1";
    storage.removeItem(SESSION_STORAGE_TEST_KEY);
    return canUseStorage;
  } catch {
    return false;
  }
}
