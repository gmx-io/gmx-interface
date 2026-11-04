import { Trans } from "@lingui/macro";

import { helperToast } from "lib/helperToast";

import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";

export function toastEnableExpress(openSettings: () => void) {
  helperToast.success(
    <Trans>
      Express Trading enabled. Disable in <EmbeddedActionButton onClick={openSettings}>settings</EmbeddedActionButton>
    </Trans>
  );
}
