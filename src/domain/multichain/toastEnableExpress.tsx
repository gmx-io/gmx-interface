import { Trans } from "@lingui/macro";

import { helperToast } from "lib/helperToast";

import Button from "components/Button/Button";

export function toastEnableExpress(openSettings: () => void) {
  helperToast.success(
    <Trans>
      Express trading was enabled to allow the use of collateral from your GMX account balance. You can disable it in
      the{" "}
      <Button variant="link" onClick={openSettings}>
        settings
      </Button>
      .
    </Trans>
  );
}
