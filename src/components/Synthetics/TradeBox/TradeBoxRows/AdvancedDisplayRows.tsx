import { Trans, t } from "@lingui/macro";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import { AcceptablePriceImpactInputRow } from "components/Synthetics/AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import { ExpandableRow } from "components/Synthetics/ExpandableRow";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import {
  selectTradeboxAdvancedOptions,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxFees,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsLeverageEnabled,
  selectTradeboxKeepLeverage,
  selectTradeboxLeverage,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxSetAdvancedOptions,
  selectTradeboxSetKeepLeverage,
  selectTradeboxSetSelectedAcceptablePriceImpactBps,
  selectTradeboxTradeFlags,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { selectTradeboxCollateralSpreadInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxCollateralSpreadInfo";
import { selectTradeboxLiquidityInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxLiquidityInfo";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "domain/synthetics/orders";
import { formatLeverage } from "domain/synthetics/positions";
import { formatDeltaUsd, formatPercentage, formatUsd } from "lib/numbers";
import { ReactNode, useCallback, useMemo } from "react";

import { AllowedSlippageRow } from "./AllowedSlippageRow";
import { AvailableLiquidityRow } from "./AvailableLiquidityRow";
import { CollateralSpreadRow } from "./CollateralSpreadRow";
import { EntryPriceRow } from "./EntryPriceRow";
import { SwapSpreadRow } from "./SwapSpreadRow";

export function AdvancedDisplayRows() {
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const limitPrice = useSelector(selectTradeboxTriggerPrice);

  const setSelectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSetSelectedAcceptablePriceImpactBps);
  const selectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const defaultTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxDefaultTriggerAcceptablePriceImpactBps);
  const fees = useSelector(selectTradeboxFees);

  const { isMarket, isLimit, isTrigger, isSwap } = tradeFlags;

  const isInputDisabled = useMemo(() => {
    if (isLimit && increaseAmounts) {
      return limitPrice === undefined || limitPrice === 0n;
    }

    return decreaseAmounts && decreaseAmounts.triggerOrderType === OrderType.StopLossDecrease;
  }, [decreaseAmounts, increaseAmounts, isLimit, limitPrice]);

  return (
    <>
      <SwapSpreadRow />
      <AvailableLiquidityRow />
      <CollateralSpreadRow />
      {isMarket && <AllowedSlippageRow />}
      {(isLimit || isTrigger) && !isSwap && (
        <AcceptablePriceImpactInputRow
          className="!mb-0 mt-8"
          notAvailable={
            isInputDisabled ||
            defaultTriggerAcceptablePriceImpactBps === undefined ||
            selectedTriggerAcceptablePriceImpactBps === undefined
          }
          acceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps}
          recommendedAcceptablePriceImpactBps={defaultTriggerAcceptablePriceImpactBps}
          priceImpactFeeBps={fees?.positionPriceImpact?.bps}
          setAcceptablePriceImpactBps={setSelectedTriggerAcceptablePriceImpactBps}
        />
      )}
    </>
  );
}

function LeverageInfoRows() {
  const { isIncrease, isTrigger } = useSelector(selectTradeboxTradeFlags);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const isLeverageEnabled = useSelector(selectTradeboxIsLeverageEnabled);
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const leverage = useSelector(selectTradeboxLeverage);
  const keepLeverage = useSelector(selectTradeboxKeepLeverage);
  const setKeepLeverage = useSelector(selectTradeboxSetKeepLeverage);

  if (isIncrease) {
    return (
      <ExchangeInfo.Row
        label={t`Leverage`}
        value={
          nextPositionValues?.nextLeverage && increaseAmounts?.sizeDeltaUsd && increaseAmounts?.sizeDeltaUsd > 0 ? (
            <ValueTransition
              from={formatLeverage(selectedPosition?.leverage)}
              to={formatLeverage(nextPositionValues?.nextLeverage) || "-"}
            />
          ) : (
            formatLeverage(isLeverageEnabled ? leverage : increaseAmounts?.estimatedLeverage) || "-"
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

    const keepLeverageChecked = decreaseAmounts?.isFullClose ? false : keepLeverage ?? false;

    return (
      <>
        <ExchangeInfo.Row label={t`Leverage`} value={leverageValue} />
        {selectedPosition?.leverage && (
          <ToggleSwitch
            isChecked={keepLeverageChecked}
            setIsChecked={setKeepLeverage}
            disabled={decreaseAmounts?.isFullClose}
          >
            <span className="text-14 text-gray-300">
              <Trans>Keep leverage at {formatLeverage(selectedPosition.leverage)}</Trans>
            </span>
          </ToggleSwitch>
        )}
      </>
    );
  }
}

function ExistingPositionInfoRows() {
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const { isSwap, isIncrease } = useSelector(selectTradeboxTradeFlags);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);

  if (!selectedPosition || isSwap) {
    return null;
  }

  return (
    <>
      {selectedPosition?.sizeInUsd && selectedPosition.sizeInUsd > 0 && (
        <ExchangeInfo.Row
          label={t`Size`}
          value={
            <ValueTransition
              from={formatUsd(selectedPosition.sizeInUsd)!}
              to={formatUsd(nextPositionValues?.nextSizeUsd)}
            />
          }
        />
      )}
      {!isIncrease && (
        <ExchangeInfo.Row
          label={t`PnL`}
          value={
            <ValueTransition
              from={
                <>
                  {formatDeltaUsd(decreaseAmounts?.estimatedPnl)} (
                  {formatPercentage(decreaseAmounts?.estimatedPnlPercentage, { signed: true })})
                </>
              }
              to={
                decreaseAmounts?.sizeDeltaUsd && decreaseAmounts.sizeDeltaUsd > 0 ? (
                  <>
                    {formatDeltaUsd(nextPositionValues?.nextPnl)} (
                    {formatPercentage(nextPositionValues?.nextPnlPercentage, { signed: true })})
                  </>
                ) : undefined
              }
            />
          }
        />
      )}
      <ExchangeInfo.Row
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

export function TradeBoxAdvancedGroups() {
  const options = useSelector(selectTradeboxAdvancedOptions);
  const setOptions = useSelector(selectTradeboxSetAdvancedOptions);
  const { isSwap } = useSelector(selectTradeboxTradeFlags);

  const { isLiquidityRisk } = useSelector(selectTradeboxLiquidityInfo);
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

  const isVisible = isSwap ? true : options.advancedDisplay;

  return (
    <ExpandableRow
      open={isVisible}
      title={t`Advanced Display`}
      hideExpand={isSwap}
      onToggle={toggleAdvancedDisplay}
      disableCollapseOnError={false}
      hasError={hasError}
    >
      <AdvancedDisplayRows />
      <div className="App-card-divider" />
      <LeverageInfoRows />
      <EntryPriceRow />
      <ExistingPositionInfoRows />
      {!isSwap && <div className="App-card-divider" />}
    </ExpandableRow>
  );
}
