import { Trans } from "@lingui/macro";

import { helperToast } from "lib/helperToast";

export function toastEnableExpress(openSettings: () => void) {
  helperToast.info(
    <Trans>
      You can only use collateral from your balance through{" "}
      <span className="cursor-pointer underline" onClick={openSettings}>
        GMX Express
      </span>
      . Proceeding to open this order will activate{" "}
      <span className="cursor-pointer underline" onClick={openSettings}>
        GMX Express
      </span>
      .
    </Trans>
  );
}
