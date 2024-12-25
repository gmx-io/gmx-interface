import { t, Trans } from "@lingui/macro";
import { useMemo } from "react";

import Checkbox from "components/Checkbox/Checkbox";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import Tooltip from "components/Tooltip/Tooltip";

export function GmSwapWarningsRow({
  isSingle,
  isAccepted,
  shouldShowWarning,
  shouldShowWarningForPosition,
  shouldShowWarningForExecutionFee,
  setIsAccepted,
}: {
  isSingle: boolean;
  isAccepted: boolean;
  shouldShowWarning: boolean;
  shouldShowWarningForPosition: boolean;
  shouldShowWarningForExecutionFee: boolean;
  setIsAccepted: (val: boolean) => void;
}) {
  const warnings = useMemo(() => {
    const warnings: string[] = [];
    if (shouldShowWarningForPosition) {
      warnings.push(t`price impact`);
    }

    if (shouldShowWarningForExecutionFee) {
      warnings.push(t`network fees`);
    }

    return warnings;
  }, [shouldShowWarningForPosition, shouldShowWarningForExecutionFee]);

  const warningText = useMemo(() => {
    return warnings.length > 1 ? (
      <Trans>
        Acknowledge high {warnings.slice(0, -1).join(", ")} and {warnings.slice(-1)}
      </Trans>
    ) : (
      <Trans>Acknowledge high {warnings[0]}</Trans>
    );
  }, [warnings]);

  if (!shouldShowWarning) {
    return null;
  }

  return (
    <ExchangeInfo.Group>
      <Checkbox className="GmSwapBox-warning" asRow isChecked={isAccepted} setIsChecked={setIsAccepted}>
        {isSingle && shouldShowWarningForPosition ? (
          <Tooltip
            className="warning-tooltip"
            handle={warningText}
            position="top-start"
            content={<Trans>Consider selecting and using the "Pair" option to reduce the Price Impact.</Trans>}
          />
        ) : (
          <span className="muted text-14 text-yellow-500">{warningText}</span>
        )}
      </Checkbox>
    </ExchangeInfo.Group>
  );
}
