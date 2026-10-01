import { reportStartupError } from "lib/metrics/startupErrors";

let startupStage = "entry";

export function logAppStartup(stage: string) {
  startupStage = stage;
  console.info(`[AppStartup] ${stage}`, { elapsedMs: Math.round(performance.now()) });
}

export function logAppStartupError(source: string, error: unknown, details?: Record<string, unknown>) {
  console.error(`[AppStartup] ${source}`, error, {
    stage: startupStage,
    elapsedMs: Math.round(performance.now()),
    ...details,
  });
}

export function completeAppStartup() {
  logAppStartup("App mounted; hiding loading screen");
  document.getElementById("app-splash")?.remove();
  const loadingScreen = document.getElementById("app-loading");
  if (loadingScreen) {
    loadingScreen.hidden = true;
  }
}

export function showAppLoadError(error: unknown, componentStack?: string | null) {
  logAppStartupError("Showing startup error screen", error, { componentStack });
  document.getElementById("app-splash")?.remove();
  const loadingScreen = document.getElementById("app-loading");
  const message = document.getElementById("app-loading-message");
  if (loadingScreen) {
    loadingScreen.hidden = false;
  }
  if (message) {
    message.textContent = "Something went wrong";
  }
  reportStartupError(error, "app.startup");
}
