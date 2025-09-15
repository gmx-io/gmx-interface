import { Trans, t } from "@lingui/macro";
import { useState } from "react";

import { usePositionEditorPosition } from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { selectPositionEditorCollateralInputAmountAndUsd } from "context/SyntheticsStateContext/selectors/positionEditorSelectors";
import { selectTradeboxAdvancedOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatLeverage } from "domain/synthetics/positions";
import { formatUsd } from "lib/numbers";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { ExpandableRow } from "../ExpandableRow";
import { NetworkFeeRow } from "../NetworkFeeRow/NetworkFeeRow";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import { usePositionEditorData } from "./hooks/usePositionEditorData";
import { Options, usePositionEditorFees } from "./hooks/usePositionEditorFees";

export function PositionEditorAdvancedRows({ operation, gasPaymentParams }: Options) {
  const position = usePositionEditorPosition();

  const { collateralDeltaUsd } = useSelector(selectPositionEditorCollateralInputAmountAndUsd);

  const { nextCollateralUsd, nextLeverage } = usePositionEditorData({
    operation,
  });

  const { advancedDisplay } = useSelector(selectTradeboxAdvancedOptions);
  const [open, setOpen] = useState(advancedDisplay);

  const { fees, executionFee } = usePositionEditorFees({
    operation,
  });

  if (!position || collateralDeltaUsd === undefined) {
    return null;
  }

  return (
    <ExpandableRow title={t`Execution Details`} open={open} onToggle={setOpen} contentClassName="flex flex-col gap-14">
      <TradeFeesRow {...fees} feesType="edit" shouldShowRebate={false} />
      <NetworkFeeRow executionFee={executionFee} gasPaymentParams={gasPaymentParams} />

      <SyntheticsInfoRow
        label={t`Leverage`}
        value={<ValueTransition from={formatLeverage(position?.leverage)} to={formatLeverage(nextLeverage)} />}
      />
      <SyntheticsInfoRow label={t`Size`} value={formatUsd(position.sizeInUsd)} />
      <SyntheticsInfoRow
        label={
          <TooltipWithPortal
            handle={
              <span className="Exchange-info-label">
                <Trans>Collateral ({position?.collateralToken?.symbol})</Trans>
              </span>
            }
            position="left-start"
            content={<Trans>Initial collateral (collateral excluding borrow and funding fee).</Trans>}
          />
        }
        value={
          <ValueTransition
            from={formatUsd(position?.collateralUsd)!}
            to={collateralDeltaUsd !== undefined && collateralDeltaUsd > 0 ? formatUsd(nextCollateralUsd) : undefined}
          />
        }
      />
    </ExpandableRow>
  );
}
