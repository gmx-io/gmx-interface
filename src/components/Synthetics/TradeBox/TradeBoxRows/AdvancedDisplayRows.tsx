import { t, Trans } from "@lingui/macro";
import { ReactNode, useCallback, useMemo } from "react";

import {
  selectTradeboxAdvancedOptions,
  selectTradeboxAllowedSlippage,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxDefaultAllowedSwapSlippageBps,
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxExecutionPrice,
  selectTradeboxFees,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedAllowedSwapSlippageBps,
  selectTradeboxSelectedPosition,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxSetAdvancedOptions,
  selectTradeboxSetSelectedAcceptablePriceImpactBps,
  selectTradeboxSetSelectedAllowedSwapSlippageBps,
  selectTradeboxTotalSwapImpactBps,
  selectTradeboxToToken,
  selectTradeboxTradeFeesType,
  selectTradeboxTradeFlags,
  selectTradeboxTriggerPrice,
  selectTradeboxTriggerRatioInputValue,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxCollateralSpreadInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxCollateralSpreadInfo";
import { selectTradeboxLiquidityInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxLiquidityInfo";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "domain/synthetics/orders";
import { formatLeverage } from "domain/synthetics/positions";
import { formatUsd } from "lib/numbers";
import { isStopIncreaseOrderType } from "sdk/utils/orders";
import { applySlippageToPrice } from "sdk/utils/trade";

import { AcceptablePriceImpactInputRow } from "components/Synthetics/AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import { AllowedSwapSlippageInputRow } from "components/Synthetics/AllowedSwapSlippageInputRowImpl/AllowedSwapSlippageInputRowImpl";
import { ExecutionPriceRow } from "components/Synthetics/ExecutionPriceRow";
import { ExpandableRow } from "components/Synthetics/ExpandableRow";
import { NetworkFeeRow } from "components/Synthetics/NetworkFeeRow/NetworkFeeRow";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import { TradeFeesRow } from "components/Synthetics/TradeFeesRow/TradeFeesRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { AllowedSlippageRow } from "./AllowedSlippageRow";
import { AvailableLiquidityRow } from "./AvailableLiquidityRow";
import { CollateralSpreadRow } from "./CollateralSpreadRow";
import { EntryPriceRow } from "./EntryPriceRow";
import { SwapSpreadRow } from "./SwapSpreadRow";
import { useTPSLSummaryExecutionFee } from "../hooks/useTPSLSummaryExecutionFee";
import { useTradeboxAllowedSwapSlippageValues } from "../hooks/useTradeboxAllowedSwapSlippageValues";

function LeverageInfoRows() {
  const { isIncrease, isTrigger } = useSelector(selectTradeboxTradeFlags);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);

  if (isIncrease && selectedPosition) {
    return (
      <SyntheticsInfoRow
        label={t`Leverage`}
        value={
          nextPositionValues?.nextLeverage && increaseAmounts?.sizeDeltaUsd && increaseAmounts?.sizeDeltaUsd > 0 ? (
            <ValueTransition
              from={formatLeverage(selectedPosition?.leverage)}
              to={formatLeverage(nextPositionValues?.nextLeverage) || "-"}
            />
          ) : (
            "-"
          )
        }
      />
    );
  } else if (isTrigger && selectedPosition) {
    let leverageValue: ReactNode = "-";

    if (decreaseAmounts?.isFullClose) {
      leverageValue = t`NA`;
    } else if (selectedPosition.sizeInUsd === (decreaseAmounts?.sizeDeltaUsd || 0n)) {
      leverageValue = "-";
    } else {
      leverageValue = (
        <ValueTransition
          from={formatLeverage(selectedPosition.leverage)}
          to={formatLeverage(nextPositionValues?.nextLeverage)}
        />
      );
    }

    return (
      <>
        <SyntheticsInfoRow label={t`Leverage`} value={leverageValue} />
      </>
    );
  }

  return null;
}

function ExistingPositionInfoRows() {
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const { isSwap } = useSelector(selectTradeboxTradeFlags);

  if (!selectedPosition || isSwap) {
    return null;
  }

  return (
    <>
      {selectedPosition?.sizeInUsd !== undefined && selectedPosition.sizeInUsd > 0 && (
        <SyntheticsInfoRow
          label={t`Size`}
          value={
            <ValueTransition
              from={formatUsd(selectedPosition.sizeInUsd)!}
              to={formatUsd(nextPositionValues?.nextSizeUsd)}
            />
          }
        />
      )}
      <SyntheticsInfoRow
        label={t`Collateral (${selectedPosition?.collateralToken?.symbol})`}
        value={
          <ValueTransition
            from={formatUsd(selectedPosition?.collateralUsd)}
            to={formatUsd(nextPositionValues?.nextCollateralUsd)}
          />
        }
      />
    </>
  );
}

function IncreaseOrderRow() {
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isMarket, isLong } = tradeFlags;
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const fees = useSelector(selectTradeboxFees);
  const executionPrice = useSelector(selectTradeboxExecutionPrice);
  const toToken = useSelector(selectTradeboxToToken);

  const acceptablePrice =
    isMarket && increaseAmounts?.acceptablePrice
      ? applySlippageToPrice(allowedSlippage, increaseAmounts.acceptablePrice, true, isLong)
      : increaseAmounts?.acceptablePrice;

  return (
    <ExecutionPriceRow
      tradeFlags={tradeFlags}
      fees={fees}
      acceptablePrice={acceptablePrice}
      executionPrice={executionPrice ?? undefined}
      visualMultiplier={toToken?.visualMultiplier}
      triggerOrderType={increaseAmounts?.limitOrderType}
    />
  );
}

function DecreaseOrderRow() {
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isMarket, isLong } = tradeFlags;
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const fees = useSelector(selectTradeboxFees);
  const executionPrice = useSelector(selectTradeboxExecutionPrice);
  const toToken = useSelector(selectTradeboxToToken);

  const acceptablePrice =
    isMarket && decreaseAmounts?.acceptablePrice
      ? applySlippageToPrice(allowedSlippage, decreaseAmounts.acceptablePrice, true, isLong)
      : decreaseAmounts?.acceptablePrice;

  return (
    <ExecutionPriceRow
      tradeFlags={tradeFlags}
      fees={fees}
      acceptablePrice={acceptablePrice}
      executionPrice={executionPrice ?? undefined}
      visualMultiplier={toToken?.visualMultiplier}
      triggerOrderType={decreaseAmounts?.triggerOrderType}
    />
  );
}

export function TradeBoxAdvancedGroups({ slippageInputId }: { slippageInputId: string }) {
  const options = useSelector(selectTradeboxAdvancedOptions);
  const setOptions = useSelector(selectTradeboxSetAdvancedOptions);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isSwap, isIncrease, isMarket, isLimit, isTrigger, isTwap } = tradeFlags;

  const { isLiquidityRisk } = useSelector(selectTradeboxLiquidityInfo);

  const fees = useSelector(selectTradeboxFees);
  const feesType = useSelector(selectTradeboxTradeFeesType);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const limitPrice = useSelector(selectTradeboxTriggerPrice);
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const triggerRatioInputValue = useSelector(selectTradeboxTriggerRatioInputValue);
  const totalSwapImpactBps = useSelector(selectTradeboxTotalSwapImpactBps);

  const setSelectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSetSelectedAcceptablePriceImpactBps);
  const selectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const defaultTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxDefaultTriggerAcceptablePriceImpactBps);

  const defaultAllowedSwapSlippageBps = useSelector(selectTradeboxDefaultAllowedSwapSlippageBps);
  const selectedAllowedSwapSlippageBps = useSelector(selectTradeboxSelectedAllowedSwapSlippageBps);
  const setSelectedAllowedSwapSlippageBps = useSelector(selectTradeboxSetSelectedAllowedSwapSlippageBps);

  useTradeboxAllowedSwapSlippageValues();

  const isPriceImpactInputDisabled = useMemo(() => {
    if (isLimit && increaseAmounts) {
      if (increaseAmounts.limitOrderType && isStopIncreaseOrderType(increaseAmounts.limitOrderType)) {
        return true;
      }

      return limitPrice === undefined || limitPrice === 0n;
    }

    return decreaseAmounts && decreaseAmounts.triggerOrderType === OrderType.StopLossDecrease;
  }, [decreaseAmounts, increaseAmounts, isLimit, limitPrice]);

  const isSwapImpactInputDisabled = useMemo(() => {
    if (isLimit && isSwap) {
      return !triggerRatioInputValue;
    }

    return true;
  }, [isLimit, isSwap, triggerRatioInputValue]);

  const collateralSpreadInfo = useSelector(selectTradeboxCollateralSpreadInfo);

  const hasError = useMemo(() => {
    return isLiquidityRisk || collateralSpreadInfo?.isHigh;
  }, [isLiquidityRisk, collateralSpreadInfo]);

  const toggleAdvancedDisplay = useCallback(
    (value: boolean) => {
      setOptions((ops) => ({
        ...ops,
        advancedDisplay: value,
      }));
    },
    [setOptions]
  );

  const isVisible = options.advancedDisplay;

  const { summaryExecutionFee } = useTPSLSummaryExecutionFee();

  return (
    <ExpandableRow
      open={isVisible}
      title={t`Execution Details`}
      onToggle={toggleAdvancedDisplay}
      disableCollapseOnError={false}
      hasError={hasError}
      className="flex flex-col gap-14"
      contentClassName="flex flex-col gap-14"
      scrollIntoViewOnMobile
    >
      {(isLimit || isTrigger || isTwap) && !isSwap && (
        <>
          <AcceptablePriceImpactInputRow
            notAvailable={
              isPriceImpactInputDisabled ||
              defaultTriggerAcceptablePriceImpactBps === undefined ||
              selectedTriggerAcceptablePriceImpactBps === undefined
            }
            acceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps}
            recommendedAcceptablePriceImpactBps={defaultTriggerAcceptablePriceImpactBps}
            priceImpactFeeBps={fees?.positionPriceImpact?.bps}
            setAcceptablePriceImpactBps={setSelectedTriggerAcceptablePriceImpactBps}
          />
          {!isTwap && <div className="h-1 shrink-0 bg-stroke-primary" />}
        </>
      )}

      {isIncrease && !isTwap && <IncreaseOrderRow />}
      {isTrigger && <DecreaseOrderRow />}
      <TradeFeesRow {...fees} feesType={feesType} />
      <NetworkFeeRow executionFee={summaryExecutionFee} />

      {isTwap && isSwap ? (
        <SyntheticsInfoRow label={<Trans>Acceptable Swap Impact</Trans>} value={<Trans>N/A</Trans>} />
      ) : null}

      {((isSwap && !isTwap) || isLimit || (isMarket && !isSwap) || isMarket) && (
        <div className="h-1 shrink-0 bg-stroke-primary" />
      )}

      {/* only when isSwap */}
      {isSwap && <SwapSpreadRow />}
      {/* only when isLimit */}
      {isSwap && isLimit && (
        <AllowedSwapSlippageInputRow
          notAvailable={
            isSwapImpactInputDisabled ||
            defaultAllowedSwapSlippageBps === undefined ||
            selectedAllowedSwapSlippageBps === undefined
          }
          totalSwapImpactBps={totalSwapImpactBps}
          allowedSwapSlippageBps={selectedAllowedSwapSlippageBps}
          recommendedAllowedSwapSlippageBps={defaultAllowedSwapSlippageBps}
          setAllowedSwapSlippageBps={setSelectedAllowedSwapSlippageBps}
        />
      )}
      {(isLimit || isTwap) && <AvailableLiquidityRow />}
      {/* only when isMarket and not a swap */}
      {!isTwap && (
        <>
          {isMarket && !isSwap && <CollateralSpreadRow />}
          {isMarket && <AllowedSlippageRow slippageInputId={slippageInputId} />}

          {((isIncrease && selectedPosition) || (isTrigger && selectedPosition)) && (
            <div className="h-1 shrink-0 bg-stroke-primary" />
          )}

          <LeverageInfoRows />
          <EntryPriceRow />
          <ExistingPositionInfoRows />
        </>
      )}
    </ExpandableRow>
  );
}
