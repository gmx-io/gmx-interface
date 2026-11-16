import { showAppLoadError } from "lib/appStartup";
import { getIsReloadingFromNetwork } from "lib/pwa/recoveryNavigation";
import { registerPreloadErrorRecovery } from "lib/pwa/registerPreloadErrorRecovery";

registerPreloadErrorRecovery();

void import("./App/bootstrap")
  .then(({ bootstrap }) => bootstrap())
  .catch((error: unknown) => {
    if (!getIsReloadingFromNetwork()) {
      showAppLoadError(error);
    }
  });
