import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import { AcceptablePriceImpactInputRow } from "components/Synthetics/AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
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
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "domain/synthetics/orders";
import { formatLeverage } from "domain/synthetics/positions";
import { ReactNode, useCallback, useEffect, useMemo } from "react";
import { BiChevronDown, BiChevronUp } from "react-icons/bi";
import { AllowedSlippageRow } from "./AllowedSlippageRow";
import { AvailableLiquidityRow } from "./AvailableLiquidityRow";
import { CollateralSpreadRow } from "./CollateralSpreadRow";
import { EntryPriceRow } from "./EntryPriceRow";
import { SwapSpreadRow } from "./SwapSpreadRow";
import { formatDeltaUsd, formatPercentage, formatUsd } from "lib/numbers";
import { selectTradeboxLiquidityInfo } from "context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxLiquidityInfo";
import { usePrevious } from "lib/usePrevious";

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

  const hasError = useMemo(() => {
    return isLiquidityRisk;
  }, [isLiquidityRisk]);

  const previousHasError = usePrevious(hasError);

  useEffect(() => {
    if (hasError && !previousHasError) {
      setOptions((ops) => ({
        ...ops,
        advancedDisplay: true,
      }));
    }
  }, [hasError, previousHasError, setOptions]);

  const toggleAdvancedDisplay = useCallback(() => {
    setOptions((ops) => ({
      ...ops,
      advancedDisplay: !options.advancedDisplay,
    }));
  }, [setOptions, options.advancedDisplay]);

  const isVisible = isSwap ? true : options.advancedDisplay;

  return (
    <>
      <ExchangeInfo.Group>
        {!isSwap && (
          <ExchangeInfo.Row
            className={cx("!items-center", {
              "!mb-12": options.advancedDisplay,
            })}
            onClick={toggleAdvancedDisplay}
            label={
              <span className="flex flex-row justify-between align-middle">
                <Trans>Advanced display</Trans>
              </span>
            }
            value={
              options.advancedDisplay ? (
                <BiChevronUp className="-mb-4 -mr-[0.5rem] -mt-4 h-24 w-24" />
              ) : (
                <BiChevronDown className="-mb-4 -mr-[0.5rem] -mt-4 h-24 w-24" />
              )
            }
          />
        )}
        {isVisible && <AdvancedDisplayRows />}
      </ExchangeInfo.Group>
      {isVisible && (
        <>
          <div className="App-card-divider" />
          <ExchangeInfo.Group>
            <LeverageInfoRows />
            <EntryPriceRow />
            <ExistingPositionInfoRows />
          </ExchangeInfo.Group>
        </>
      )}
      <div className="App-card-divider" />
    </>
  );
}
