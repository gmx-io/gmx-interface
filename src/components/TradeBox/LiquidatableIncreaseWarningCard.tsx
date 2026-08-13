import { Trans } from "@lingui/macro";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

export function LiquidatableIncreaseWarningCard() {
  return (
    <AlertInfoCard type="warning" hideClose>
      <Trans>
        Order may not execute: the resulting position would be liquidatable at the trigger price. Deposit margin or
        reduce the order size.
      </Trans>
    </AlertInfoCard>
  );
}
