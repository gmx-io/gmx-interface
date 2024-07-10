import { useEffect } from "react";
import { usePrevious } from "react-use";

import {
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxFromTokenAddress,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxLeverage,
  selectTradeboxMarketInfo,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxSetDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxSetFixedTriggerOrderType,
  selectTradeboxSetFixedTriggerThresholdType,
  selectTradeboxSetSelectedAcceptablePriceImpactBps,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { bigMath } from "lib/bigmath";

export function useTradeboxAvailablePriceImpactValues() {
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const leverage = useSelector(selectTradeboxLeverage);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const defaultTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxDefaultTriggerAcceptablePriceImpactBps);
  const selectedTriggerAcceptablePriceImpaceBps = useSelector(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);

  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const toTokenAdderss = useSelector(selectTradeboxToTokenAddress);

  const previousMarketIndexTokenAddress = usePrevious(marketInfo?.indexTokenAddress);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const limitPrice = useSelector(selectTradeboxTriggerPrice);
  const previousLeverage = usePrevious(leverage);
  const previousToTokenAddress = usePrevious(toTokenAdderss);
  const previousFromTokenAddress = usePrevious(fromTokenAddress);

  const { isLimit, isTrigger } = tradeFlags;

  const previousTradeIsLong = usePrevious(tradeFlags.isLong);
  const previousIsLimit = usePrevious(tradeFlags.isLimit);
  const previousIsTrigger = usePrevious(tradeFlags.isTrigger);

  const previousLimitPrice = usePrevious(limitPrice);

  const setDefaultTriggerAcceptablePriceImpactBps = useSelector(
    selectTradeboxSetDefaultTriggerAcceptablePriceImpactBps
  );
  const setSelectedAcceptablePriceImpactBps = useSelector(selectTradeboxSetSelectedAcceptablePriceImpactBps);
  const setFixedTriggerOrderType = useSelector(selectTradeboxSetFixedTriggerOrderType);
  const setFixedTriggerThresholdType = useSelector(selectTradeboxSetFixedTriggerThresholdType);

  /**
   * Drop selected acceptable price impact when user changes market/pool/trade type/limit price
   */
  useEffect(() => {
    const isMarketChanged = previousMarketIndexTokenAddress !== marketInfo?.indexTokenAddress;
    const isTradeTypeChanged = previousTradeIsLong !== tradeFlags.isLong;
    const isLimitChanged = previousIsLimit !== tradeFlags.isLimit;
    const isTriggerChanged = previousIsTrigger !== tradeFlags.isTrigger;
    const isLimitPriceChanged = limitPrice !== previousLimitPrice;
    const isLeverageChanged = previousLeverage !== leverage;
    const isFromTokenAddressChanged = previousFromTokenAddress !== fromTokenAddress;
    const isToTokenAddressChanged = previousToTokenAddress !== toTokenAdderss;

    if (
      [
        isMarketChanged,
        isTradeTypeChanged,
        isLimitChanged,
        isTriggerChanged,
        isLimitPriceChanged,
        isLeverageChanged,
        isFromTokenAddressChanged,
        isToTokenAddressChanged,
      ].some(Boolean)
    ) {
      setDefaultTriggerAcceptablePriceImpactBps(undefined);
      setSelectedAcceptablePriceImpactBps(undefined);
    }
  }, [
    limitPrice,
    marketInfo?.indexTokenAddress,
    previousIsLimit,
    previousIsTrigger,
    previousMarketIndexTokenAddress,
    previousTradeIsLong,
    setDefaultTriggerAcceptablePriceImpactBps,
    setSelectedAcceptablePriceImpactBps,
    tradeFlags.isLimit,
    tradeFlags.isLong,
    tradeFlags.isTrigger,
    previousLimitPrice,
    leverage,
    previousLeverage,
    fromTokenAddress,
    previousFromTokenAddress,
    toTokenAdderss,
    previousToTokenAddress,
  ]);

  /**
   * Set initial value for limit orders
   */
  useEffect(() => {
    if (
      isLimit &&
      increaseAmounts?.acceptablePrice &&
      defaultTriggerAcceptablePriceImpactBps === undefined &&
      selectedTriggerAcceptablePriceImpaceBps === undefined
    ) {
      setSelectedAcceptablePriceImpactBps(bigMath.abs(increaseAmounts.acceptablePriceDeltaBps));
      setDefaultTriggerAcceptablePriceImpactBps(bigMath.abs(increaseAmounts.acceptablePriceDeltaBps));
    }
  }, [
    defaultTriggerAcceptablePriceImpactBps,
    increaseAmounts?.acceptablePrice,
    increaseAmounts?.acceptablePriceDeltaBps,
    isLimit,
    selectedTriggerAcceptablePriceImpaceBps,
    setDefaultTriggerAcceptablePriceImpactBps,
    setSelectedAcceptablePriceImpactBps,
  ]);

  /**
   * Set initial values from TP/SL orders
   */
  useEffect(() => {
    if (
      isTrigger &&
      decreaseAmounts?.triggerThresholdType &&
      decreaseAmounts?.triggerOrderType &&
      decreaseAmounts.acceptablePrice !== undefined &&
      defaultTriggerAcceptablePriceImpactBps === undefined &&
      selectedTriggerAcceptablePriceImpaceBps === undefined
    ) {
      setFixedTriggerOrderType(decreaseAmounts.triggerOrderType);
      setFixedTriggerThresholdType(decreaseAmounts.triggerThresholdType);
      setSelectedAcceptablePriceImpactBps(bigMath.abs(decreaseAmounts.recommendedAcceptablePriceDeltaBps));
      setDefaultTriggerAcceptablePriceImpactBps(bigMath.abs(decreaseAmounts.recommendedAcceptablePriceDeltaBps));
    }
  }, [
    decreaseAmounts?.acceptablePrice,
    decreaseAmounts?.recommendedAcceptablePriceDeltaBps,
    decreaseAmounts?.triggerOrderType,
    decreaseAmounts?.triggerThresholdType,
    defaultTriggerAcceptablePriceImpactBps,
    isTrigger,
    selectedTriggerAcceptablePriceImpaceBps,
    setDefaultTriggerAcceptablePriceImpactBps,
    setFixedTriggerOrderType,
    setFixedTriggerThresholdType,
    setSelectedAcceptablePriceImpactBps,
  ]);
}
