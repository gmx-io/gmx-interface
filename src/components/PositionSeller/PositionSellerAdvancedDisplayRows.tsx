import { Trans, t } from "@lingui/macro";

import { usePositionSeller } from "context/SyntheticsStateContext/hooks/positionSellerHooks";
import {
  selectPositionSellerDecreaseAmounts,
  selectPositionSellerFees,
  selectPositionSellerNextPositionValuesForDecrease,
  selectPositionSellerPosition,
} from "context/SyntheticsStateContext/selectors/positionSellerSelectors";
import {
  selectBreakdownNetPriceImpactEnabled,
  selectIsSetAcceptablePriceImpactEnabled,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GasPaymentParams } from "domain/synthetics/express";
import { OrderType } from "domain/synthetics/orders";
import { formatLeverage } from "domain/synthetics/positions";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatDeltaUsd, formatUsd } from "lib/numbers";

import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { AcceptablePriceImpactInputRow } from "../AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import { ExitPriceRow } from "../ExitPriceRow/ExitPriceRow";
import { ExpandableRow } from "../ExpandableRow";
import { NetworkFeeRow } from "../NetworkFeeRow/NetworkFeeRow";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { AllowedSlippageRow } from "./rows/AllowedSlippageRow";
import { TradePointsRow } from "../TradeBox/TradeBoxRows/PointsRow";
import { useTradePointsEstimate } from "../TradeBox/TradeBoxRows/useTradePointsEstimate";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";

export type Props = {
  triggerPriceInputValue: string;
  slippageInputId: string;
  gasPaymentParams?: GasPaymentParams;
};

export function PositionSellerAdvancedRows({ triggerPriceInputValue, slippageInputId, gasPaymentParams }: Props) {
  const [open, setOpen] = useLocalStorageSerializeKey("position-seller-advanced-display-rows-open", false);
  const position = useSelector(selectPositionSellerPosition);
  const breakdownNetPriceImpactEnabled = useSelector(selectBreakdownNetPriceImpactEnabled);
  const isSetAcceptablePriceImpactEnabled = useSelector(selectIsSetAcceptablePriceImpactEnabled);

  const {
    allowedSlippage,
    defaultTriggerAcceptablePriceImpactBps,
    orderOption,
    setAllowedSlippage,
    setSelectedTriggerAcceptablePriceImpactBps,
    selectedTriggerAcceptablePriceImpactBps,
  } = usePositionSeller();

  const isTwap = orderOption === OrderOption.Twap;
  const decreaseAmounts = useSelector(selectPositionSellerDecreaseAmounts);

  const nextPositionValues = useSelector(selectPositionSellerNextPositionValuesForDecrease);

  const { fees, executionFee } = useSelector(selectPositionSellerFees);
  const pointsEstimate = useTradePointsEstimate({
    fees,
    feesType: "decrease",
    marketInfo: position?.marketInfo,
    isLong: position?.isLong,
    sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
    includeBalancingBoost: false,
  });

  const isStopLoss = decreaseAmounts?.triggerOrderType === OrderType.StopLossDecrease;

  const acceptablePriceImpactInputRow = (
    <AcceptablePriceImpactInputRow
      notAvailable={!triggerPriceInputValue || isStopLoss || !decreaseAmounts}
      acceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps}
      recommendedAcceptablePriceImpactBps={defaultTriggerAcceptablePriceImpactBps}
      priceImpactFeeBps={fees?.decreasePositionPriceImpact?.bps}
      setAcceptablePriceImpactBps={setSelectedTriggerAcceptablePriceImpactBps}
    />
  );

  const sizeRow = (
    <SyntheticsInfoRow
      label={t`Size`}
      value={<ValueTransition from={formatUsd(position?.sizeInUsd)!} to={formatUsd(nextPositionValues?.nextSizeUsd)} />}
    />
  );

  let leverageValue: React.ReactNode = "-";

  if (decreaseAmounts?.isFullClose) {
    leverageValue = t`N/A`;
  } else if (position) {
    if (decreaseAmounts?.sizeDeltaUsd === position.sizeInUsd) {
      leverageValue = "-";
    } else {
      leverageValue = (
        <ValueTransition
          from={formatLeverage(position.leverage)}
          to={formatLeverage(nextPositionValues?.nextLeverage)}
        />
      );
    }
  }

  if (!position) {
    return null;
  }

  const executionDetails = (
    <ExpandableRow
      title={t`Execution details`}
      open={open}
      onToggle={setOpen}
      wrapped
      contentClassName="flex flex-col gap-14"
    >
      <ExitPriceRow isSwap={false} fees={fees} price={position.markPrice} isLong={position.isLong} />
      <TradeFeesRow
        {...fees}
        feesType="decrease"
        estimatedFeeRewardsUsd={pointsEstimate.estimatedFeeRewards?.rewardsUsd}
        estimatedFeeRewardsBasisUsd={pointsEstimate.estimatedFeeRewards?.rewardsBasisUsd}
      />
      <NetworkFeeRow executionFee={executionFee} gasPaymentParams={gasPaymentParams} />

      {isTwap ? (
        isSetAcceptablePriceImpactEnabled ? (
          acceptablePriceImpactInputRow
        ) : null
      ) : (
        <AllowedSlippageRow
          allowedSlippage={allowedSlippage}
          setAllowedSlippage={setAllowedSlippage}
          slippageInputId={slippageInputId}
        />
      )}

      {!isTwap && (
        <>
          {breakdownNetPriceImpactEnabled && (
            <SyntheticsInfoRow
              label={t`Stored price impact`}
              value={
                nextPositionValues?.nextPendingImpactDeltaUsd !== undefined &&
                position?.pendingImpactUsd !== undefined ? (
                  <ValueTransition
                    from={formatDeltaUsd(position?.pendingImpactUsd)}
                    to={formatDeltaUsd(nextPositionValues?.nextPendingImpactDeltaUsd)}
                  />
                ) : (
                  formatDeltaUsd(nextPositionValues?.nextPendingImpactDeltaUsd)
                )
              }
              valueClassName="numbers"
            />
          )}
          <SyntheticsInfoRow label={t`Leverage`} value={leverageValue} />
          {sizeRow}
          <SyntheticsInfoRow
            label={
              <Tooltip
                handle={<Trans>Margin ({position?.collateralToken?.symbol})</Trans>}
                position="top-start"
                content={
                  <Trans>
                    Current margin excludes pending borrow and funding fees. Post-close margin reflects realized PnL and
                    settled fees.
                  </Trans>
                }
                variant="iconStroke"
              />
            }
            value={
              <ValueTransition
                from={formatUsd(position?.collateralUsd)!}
                to={formatUsd(nextPositionValues?.nextCollateralUsd)}
              />
            }
          />
        </>
      )}
    </ExpandableRow>
  );

  if (!pointsEstimate.enabled) {
    return executionDetails;
  }

  return (
    <div className="rounded-8 bg-slate-700/50">
      {executionDetails}
      <TradePointsRow {...pointsEstimate} marketInfo={position.marketInfo} />
    </div>
  );
}
