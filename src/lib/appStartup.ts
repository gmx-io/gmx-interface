import { reportStartupError } from "lib/metrics/startupErrors";

export function completeAppStartup() {
  const loadingScreen = document.getElementById("app-loading");
  if (loadingScreen) {
    loadingScreen.hidden = true;
  }
}

export function showAppLoadError(error: unknown) {
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
