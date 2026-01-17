import { Trans } from "@lingui/macro";

import { helperToast } from "lib/helperToast";

import Button from "components/Button/Button";

export function toastEnableExpress(openSettings: () => void) {
  helperToast.success(
    <Trans>
      Express Trading enabled. Disable in{" "}
      <Button variant="link" onClick={openSettings}>
        settings
      </Button>
    </Trans>
  );
}
