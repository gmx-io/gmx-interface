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
    return storage.getItem(SESSION_STORAGE_TEST_KEY) === "1";
  } catch {
    return false;
  } finally {
    try {
      storage.removeItem(SESSION_STORAGE_TEST_KEY);
    } catch {
      // Ignore cleanup errors.
    }
  }
}
