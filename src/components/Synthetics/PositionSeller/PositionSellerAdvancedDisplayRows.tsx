import { Trans, t } from "@lingui/macro";
import React from "react";

import { usePositionSeller } from "context/SyntheticsStateContext/hooks/positionSellerHooks";
import {
  selectPositionSellerDecreaseAmounts,
  selectPositionSellerFees,
  selectPositionSellerNextPositionValuesForDecrease,
  selectPositionSellerPosition,
} from "context/SyntheticsStateContext/selectors/positionSellerSelectors";
import { selectTradeboxAdvancedOptions } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GasPaymentParams } from "domain/synthetics/express";
import { OrderType } from "domain/synthetics/orders";
import { formatLeverage } from "domain/synthetics/positions";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { formatUsd } from "lib/numbers";

import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { AcceptablePriceImpactInputRow } from "../AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import { ExpandableRow } from "../ExpandableRow";
import { NetworkFeeRow } from "../NetworkFeeRow/NetworkFeeRow";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import { AllowedSlippageRow } from "./rows/AllowedSlippageRow";

export type Props = {
  triggerPriceInputValue: string;
  slippageInputId: string;
  gasPaymentParams?: GasPaymentParams;
};

export function PositionSellerAdvancedRows({ triggerPriceInputValue, slippageInputId, gasPaymentParams }: Props) {
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
  const isTwap = orderOption === OrderOption.Twap;
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

  if (!position) {
    return null;
  }

  return (
    <ExpandableRow
      title={t`Execution Details`}
      open={open}
      onToggle={setOpen}
      contentClassName="flex flex-col gap-14 pt-14"
    >
      <TradeFeesRow {...fees} feesType="decrease" />
      <NetworkFeeRow executionFee={executionFee} gasPaymentParams={gasPaymentParams} />

      {isTrigger || isTwap ? (
        acceptablePriceImpactInputRow
      ) : (
        <AllowedSlippageRow
          allowedSlippage={allowedSlippage}
          setAllowedSlippage={setAllowedSlippage}
          slippageInputId={slippageInputId}
        />
      )}

      {!isTwap && (
        <>
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
        </>
      )}
    </ExpandableRow>
  );
}
