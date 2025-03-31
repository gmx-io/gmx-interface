import { Trans, t } from "@lingui/macro";
import React, { useMemo } from "react";

import { usePositionSeller } from "context/SyntheticsStateContext/hooks/positionSellerHooks";
import {
  selectPositionSellerDecreaseAmounts,
  selectPositionSellerExecutionPrice,
  selectPositionSellerFees,
  selectPositionSellerNextPositionValuesForDecrease,
  selectPositionSellerPosition,
} from "context/SyntheticsStateContext/selectors/positionSellerSelectors";
import { selectTradeboxAdvancedOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "domain/synthetics/orders";
import { formatLeverage } from "domain/synthetics/positions";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { applySlippageToPrice } from "domain/synthetics/trade/utils";
import { formatUsd } from "lib/numbers";

import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { AllowedSlippageRow } from "./rows/AllowedSlippageRow";
import { AcceptablePriceImpactInputRow } from "../AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import { ExecutionPriceRow } from "../ExecutionPriceRow";
import { ExpandableRow } from "../ExpandableRow";
import { NetworkFeeRow } from "../NetworkFeeRow/NetworkFeeRow";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";

export type Props = {
  triggerPriceInputValue: string;
};

export function PositionSellerAdvancedRows({ triggerPriceInputValue }: Props) {
  const tradeboxAdvancedOptions = useSelector(selectTradeboxAdvancedOptions);
  const [open, setOpen] = React.useState(tradeboxAdvancedOptions.advancedDisplay);
  const position = useSelector(selectPositionSellerPosition);

  const {
    allowedSlippage,
    defaultTriggerAcceptablePriceImpactBps,
    orderOption,
    setAllowedSlippage,
    setSelectedTriggerAcceptablePriceImpactBps,
    selectedTriggerAcceptablePriceImpactBps,
  } = usePositionSeller();

  const isTrigger = orderOption === OrderOption.Trigger;

  const decreaseAmounts = useSelector(selectPositionSellerDecreaseAmounts);

  const nextPositionValues = useSelector(selectPositionSellerNextPositionValuesForDecrease);

  const { fees, executionFee } = useSelector(selectPositionSellerFees);

  const isStopLoss = decreaseAmounts?.triggerOrderType === OrderType.StopLossDecrease;

  const acceptablePriceImpactInputRow = (() => {
    return (
      <AcceptablePriceImpactInputRow
        notAvailable={!triggerPriceInputValue || isStopLoss || !decreaseAmounts}
        acceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps}
        recommendedAcceptablePriceImpactBps={defaultTriggerAcceptablePriceImpactBps}
        priceImpactFeeBps={fees?.positionPriceImpact?.bps}
        setAcceptablePriceImpactBps={setSelectedTriggerAcceptablePriceImpactBps}
      />
    );
  })();

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

  const toToken = position?.indexToken;

  const executionPrice = useSelector(selectPositionSellerExecutionPrice);

  const executionPriceFlags = useMemo(
    () => ({
      isLimit: false,
      isMarket: orderOption === OrderOption.Market,
      isIncrease: false,
      isLong: !!position?.isLong,
      isShort: !position?.isLong,
      isSwap: false,
      isPosition: true,
      isTrigger: orderOption === OrderOption.Trigger,
    }),
    [position?.isLong, orderOption]
  );

  if (!position) {
    return null;
  }

  const shouldApplySlippage = orderOption === OrderOption.Market;
  const acceptablePrice =
    shouldApplySlippage && decreaseAmounts?.acceptablePrice && position
      ? applySlippageToPrice(allowedSlippage, decreaseAmounts.acceptablePrice, false, position.isLong)
      : decreaseAmounts?.acceptablePrice;

  return (
    <ExpandableRow
      title={t`Execution Details`}
      open={open}
      onToggle={setOpen}
      contentClassName="flex flex-col gap-14 pt-14"
    >
      <ExecutionPriceRow
        tradeFlags={executionPriceFlags}
        fees={fees}
        executionPrice={executionPrice ?? undefined}
        acceptablePrice={acceptablePrice}
        triggerOrderType={decreaseAmounts?.triggerOrderType}
        visualMultiplier={toToken?.visualMultiplier}
      />

      <TradeFeesRow {...fees} feesType="decrease" />
      <NetworkFeeRow executionFee={executionFee} />
      {isTrigger && acceptablePriceImpactInputRow}
      {!isTrigger && <AllowedSlippageRow allowedSlippage={allowedSlippage} setAllowedSlippage={setAllowedSlippage} />}
      <div className="h-1 bg-stroke-primary" />
      <SyntheticsInfoRow label={t`Leverage`} value={leverageValue} />

      {sizeRow}

      <SyntheticsInfoRow
        label={
          <Tooltip
            handle={<Trans>Collateral ({position?.collateralToken?.symbol})</Trans>}
            position="top-start"
            content={<Trans>Initial Collateral (Collateral excluding Borrow and Funding Fee).</Trans>}
          />
        }
        value={
          <ValueTransition
            from={formatUsd(position?.collateralUsd)!}
            to={formatUsd(nextPositionValues?.nextCollateralUsd)}
          />
        }
      />
    </ExpandableRow>
  );
}
