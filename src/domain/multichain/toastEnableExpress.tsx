import { Trans } from "@lingui/macro";

import { helperToast } from "lib/helperToast";

import Button from "components/Button/Button";

export function toastEnableExpress(openSettings: () => void) {
  helperToast.success(
    <Trans>
      Express Trading enabled to use GMX Account balance as collateral. Disable in{" "}
      <Button variant="link" onClick={openSettings}>
        Settings
      </Button>
    </Trans>
  );
}
