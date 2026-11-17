import { Trans } from "@lingui/macro";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

export function FreshPositionIncreaseWarningCard() {
  return (
    <AlertInfoCard type="warning" hideClose>
      <Trans>This order may execute after the current position is liquidated and open a new position.</Trans>
    </AlertInfoCard>
  );
}
