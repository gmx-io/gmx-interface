import { metrics } from "lib/metrics";

const RECOVERED_BUILD_KEY = "gmx-pwa-preload-error-recovered-build";
const PENDING_ERROR_KEY = "gmx-pwa-preload-error-pending";
const UNKNOWN_BUILD_ID = "unknown";

type StoredPreloadError = {
  buildId: string;
  message: string;
};

type PreloadErrorRecoveryOptions = {
  isOnline?: () => boolean;
  reloadPage?: () => void;
  reportError?: (error: Error) => void;
  storage?: Storage | null;
};

type StoreRecoveryResult = "stored" | "already-recovered" | "storage-error";

function getDocumentBuildId() {
  return document.querySelector<HTMLMetaElement>('meta[name="gmx-pwa-build-id"]')?.content ?? UNKNOWN_BUILD_ID;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

function getStoredError(storage: Storage) {
  try {
    const rawError = storage.getItem(PENDING_ERROR_KEY);
    storage.removeItem(PENDING_ERROR_KEY);
    return rawError ? (JSON.parse(rawError) as StoredPreloadError) : undefined;
  } catch {
    return undefined;
  }
}

function getSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

function storeRecovery(storage: Storage, error: StoredPreloadError): StoreRecoveryResult {
  try {
    if (storage.getItem(RECOVERED_BUILD_KEY) === error.buildId) {
      return "already-recovered";
    }

    storage.setItem(PENDING_ERROR_KEY, JSON.stringify(error));
    storage.setItem(RECOVERED_BUILD_KEY, error.buildId);
    return "stored";
  } catch {
    try {
      storage.removeItem(PENDING_ERROR_KEY);
    } catch {
      // Storage cleanup is best-effort.
    }
    return "storage-error";
  }
}

function getRecoveryFailure(error: StoredPreloadError, reason: string) {
  return new Error(`Preload recovery skipped on build ${error.buildId} (${reason}): ${error.message}`);
}

export function registerPreloadErrorRecovery(options: PreloadErrorRecoveryOptions = {}) {
  const {
    isOnline = () => navigator.onLine,
    reloadPage = () => window.location.reload(),
    reportError = (error) => metrics.pushError(error, "pwa.preloadError"),
  } = options;
  const storage = options.storage === undefined ? getSessionStorage() : options.storage;

  const storedError = storage ? getStoredError(storage) : undefined;
  if (storedError) {
    reportError(new Error(`Recovered preload failure on build ${storedError.buildId}: ${storedError.message}`));
  }

  const handlePreloadError = (event: VitePreloadErrorEvent) => {
    const error = {
      buildId: getDocumentBuildId(),
      message: getErrorMessage(event.payload),
    };

    if (!isOnline()) {
      reportError(getRecoveryFailure(error, "offline"));
      return;
    }

    if (!storage) {
      reportError(getRecoveryFailure(error, "session storage unavailable"));
      return;
    }

    const storeResult = storeRecovery(storage, error);
    if (storeResult !== "stored") {
      reportError(
        getRecoveryFailure(error, storeResult === "already-recovered" ? "reload already attempted" : "storage error")
      );
      return;
    }

    event.preventDefault();
    reloadPage();
  };

  window.addEventListener("vite:preloadError", handlePreloadError);

  return () => window.removeEventListener("vite:preloadError", handlePreloadError);
}
