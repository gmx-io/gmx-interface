import { Trans } from "@lingui/macro";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

export function FreshPositionIncreaseWarningCard({ isTpSlUnavailable = false }: { isTpSlUnavailable?: boolean }) {
  return (
    <AlertInfoCard type="warning" hideClose>
      <Trans>This order may execute after the current position is liquidated and open a new position.</Trans>
      {isTpSlUnavailable && (
        <>
          {" "}
          <Trans>TP/SL can't be added to this order. Set them after the new position opens.</Trans>
        </>
      )}
    </AlertInfoCard>
  );
}
