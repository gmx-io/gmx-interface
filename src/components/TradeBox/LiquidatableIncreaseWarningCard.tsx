import { Trans } from "@lingui/macro";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

export function LiquidatableIncreaseWarningCard() {
  return (
    <AlertInfoCard type="warning" hideClose>
      <Trans>
        This order may fail to execute with the current position state. Add collateral or reduce leverage before it
        triggers.
      </Trans>
    </AlertInfoCard>
  );
}
