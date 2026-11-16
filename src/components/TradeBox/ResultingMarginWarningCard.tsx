import { Trans } from "@lingui/macro";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";

export function ResultingMarginAlertCard({ level, isTwap }: { level: "error" | "warning"; isTwap?: boolean }) {
  return (
    <AlertInfoCard type={level} hideClose>
      {level === "error" ? (
        <Trans>The resulting position would exceed the maximum allowed leverage. Increase margin or reduce size.</Trans>
      ) : isTwap ? (
        <Trans>
          One or more later TWAP parts may fail because the resulting position would exceed the maximum allowed
          leverage. Increase margin or reduce the total size.
        </Trans>
      ) : (
        <Trans>
          This order may fail to execute because the resulting position would exceed the maximum allowed leverage.
          Increase the position's margin or reduce the order size before it triggers.
        </Trans>
      )}
    </AlertInfoCard>
  );
}
