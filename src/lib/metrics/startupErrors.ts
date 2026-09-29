import { getSessionStorage } from "lib/pwa/sessionStorage";

const STARTUP_ERRORS_KEY = "gmx-startup-errors";
const MAX_STARTUP_ERRORS = 10;

type StartupError = { message: string; stack?: string; source: string };

function readStartupErrors(): StartupError[] {
  try {
    const errors: unknown = JSON.parse(getSessionStorage()?.getItem(STARTUP_ERRORS_KEY) ?? "[]");
    return Array.isArray(errors)
      ? errors
          .filter((error) => typeof error?.message === "string" && typeof error?.source === "string")
          .slice(-MAX_STARTUP_ERRORS)
      : [];
  } catch {
    return [];
  }
}

let pendingErrors = readStartupErrors();
let reporter: ((error: Error, source: string) => void) | undefined;

function persistStartupErrors() {
  try {
    const storage = getSessionStorage();
    if (pendingErrors.length) {
      storage?.setItem(STARTUP_ERRORS_KEY, JSON.stringify(pendingErrors));
    } else {
      storage?.removeItem(STARTUP_ERRORS_KEY);
    }
  } catch {
    // Keep errors in memory when storage is unavailable.
  }
}

export function reportStartupError(error: unknown, source: string) {
  if (reporter) {
    try {
      reporter(error instanceof Error ? error : new Error(String(error)), source);
      return;
    } catch {
      // Preserve the error until reporting is available again.
    }
  }

  pendingErrors.push({
    message: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    source,
  });
  pendingErrors = pendingErrors.slice(-MAX_STARTUP_ERRORS);

  persistStartupErrors();
}

export function setStartupErrorReporter(reportError: (error: Error, source: string) => void) {
  reporter = reportError;
  pendingErrors = pendingErrors.filter((pending) => {
    const error = new Error(pending.message);
    if (typeof pending.stack === "string") {
      error.stack = pending.stack;
    }
    try {
      reportError(error, pending.source);
      return false;
    } catch {
      return true;
    }
  });
  persistStartupErrors();
}
