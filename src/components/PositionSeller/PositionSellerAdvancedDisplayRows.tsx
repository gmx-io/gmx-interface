import { Trans, t } from "@lingui/macro";

import { usePositionSeller } from "context/SyntheticsStateContext/hooks/positionSellerHooks";
import {
  selectPositionSellerDecreaseAmounts,
  selectPositionSellerFees,
  selectPositionSellerNextPositionValuesForDecrease,
  selectPositionSellerPosition,
  selectPositionSellerTriggerPrice,
} from "context/SyntheticsStateContext/selectors/positionSellerSelectors";
import {
  selectBreakdownNetPriceImpactEnabled,
  selectIsSetAcceptablePriceImpactEnabled,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { GasPaymentParams } from "domain/synthetics/express";
import { OrderType } from "domain/synthetics/orders";
import { formatLeverage } from "domain/synthetics/positions";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatDeltaUsd, formatUsd } from "lib/numbers";

import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { AcceptablePriceImpactInputRow } from "../AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import { ExpandableRow } from "../ExpandableRow";
import { NetworkFeeRow } from "../NetworkFeeRow/NetworkFeeRow";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import { AllowedSlippageRow } from "./rows/AllowedSlippageRow";
import { ExitPriceRow } from "../ExitPriceRow/ExitPriceRow";

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

  const isTrigger = orderOption === OrderOption.Trigger;
  const isTwap = orderOption === OrderOption.Twap;
  const decreaseAmounts = useSelector(selectPositionSellerDecreaseAmounts);

  const nextPositionValues = useSelector(selectPositionSellerNextPositionValuesForDecrease);

  const { fees, executionFee } = useSelector(selectPositionSellerFees);

  const triggerPrice = useSelector(selectPositionSellerTriggerPrice);

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
    leverageValue = t`NA`;
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

  return (
    <ExpandableRow title={t`Execution Details`} open={open} onToggle={setOpen} contentClassName="flex flex-col gap-14">
      <ExitPriceRow
        isSwap={false}
        fees={fees}
        price={isTrigger ? triggerPrice : position.markPrice}
        isLong={position.isLong}
      />
      <TradeFeesRow {...fees} feesType="decrease" />
      <NetworkFeeRow executionFee={executionFee} gasPaymentParams={gasPaymentParams} />

      {isTrigger || isTwap ? (
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
              label={t`Stored Price Impact`}
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
                handle={<Trans>Collateral ({position?.collateralToken?.symbol})</Trans>}
                position="top-start"
                content={<Trans>Initial collateral (collateral excluding borrow and funding fee).</Trans>}
                variant="icon"
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
}
