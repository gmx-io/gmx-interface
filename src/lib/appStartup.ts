import { reportStartupError } from "lib/metrics/startupErrors";

export function completeAppStartup() {
  document.getElementById("app-splash")?.remove();
  const loadingScreen = document.getElementById("app-loading");
  if (loadingScreen) {
    loadingScreen.hidden = true;
  }
}

export function showAppLoadError(error: unknown) {
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
