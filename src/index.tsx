import { Buffer } from "buffer";

import { logAppStartup, logAppStartupError, showAppLoadError } from "lib/appStartup";
import { getIsReloadingFromNetwork } from "lib/pwa/recoveryNavigation";
import { registerPreloadErrorRecovery } from "lib/pwa/registerPreloadErrorRecovery";

logAppStartup("Entry loaded; registering error handlers");

window.addEventListener("error", (event) => {
  logAppStartupError("Uncaught window error", event.error ?? event.message, {
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
  });
});
window.addEventListener("unhandledrejection", (event) => {
  logAppStartupError("Unhandled promise rejection", event.reason);
});

registerPreloadErrorRecovery();
globalThis.Buffer = Buffer;
logAppStartup("Browser Buffer initialized");
logAppStartup("Loading bootstrap module and dependencies");

void import("./App/bootstrap")
  .then(({ bootstrap }) => {
    logAppStartup("Bootstrap module and dependencies loaded");
    return bootstrap();
  })
  .catch((error: unknown) => {
    if (!getIsReloadingFromNetwork()) {
      showAppLoadError(error);
    } else {
      logAppStartupError("Startup failed during network reload recovery", error);
    }
  });
