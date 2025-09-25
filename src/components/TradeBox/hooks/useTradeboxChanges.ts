import { usePrevious } from "react-use";

import {
  selectTradeboxFromTokenAddress,
  selectTradeboxLeverage,
  selectTradeboxMarketInfo,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
  selectTradeboxTriggerPrice,
  selectTradeboxFromTokenInputValue,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

export function useTradeboxChanges() {
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const leverage = useSelector(selectTradeboxLeverage);
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const toTokenAddress = useSelector(selectTradeboxToTokenAddress);
  const fromTokenInputValue = useSelector(selectTradeboxFromTokenInputValue);
  const toTokenInputValue = useSelector(selectTradeboxFromTokenInputValue);

  const previousMarketIndexTokenAddress = usePrevious(marketInfo?.indexTokenAddress);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const previousLeverage = usePrevious(leverage);
  const previousToTokenAddress = usePrevious(toTokenAddress);
  const previousFromTokenAddress = usePrevious(fromTokenAddress);

  const previousTradeIsLong = usePrevious(tradeFlags.isLong);
  const previousIsLimit = usePrevious(tradeFlags.isLimit);
  const previousIsTrigger = usePrevious(tradeFlags.isTrigger);
  const previousIsSwap = usePrevious(tradeFlags.isSwap);

  const previousLimitPrice = usePrevious(triggerPrice);
  const previousFromTokenInputValue = usePrevious(fromTokenInputValue);
  const previousToTokenInputValue = usePrevious(toTokenInputValue);

  const isMarketChanged = previousMarketIndexTokenAddress !== marketInfo?.indexTokenAddress;
  const isLimitChanged = previousIsLimit !== tradeFlags.isLimit;
  const isTriggerChanged = previousIsTrigger !== tradeFlags.isTrigger;
  const isTriggerPriceChanged = triggerPrice !== previousLimitPrice;
  const isLeverageChanged = previousLeverage !== leverage;
  const isFromTokenAddressChanged = previousFromTokenAddress !== fromTokenAddress;
  const isToTokenAddressChanged = previousToTokenAddress !== toTokenAddress;
  const isDirectionChanged = previousIsSwap !== tradeFlags.isSwap || previousTradeIsLong !== tradeFlags.isLong;
  const isFromTokenInputValueChanged = previousFromTokenInputValue !== fromTokenInputValue;
  const isToTokenInputValueChanged = previousToTokenInputValue !== toTokenInputValue;

  return {
    market: isMarketChanged,
    direction: isDirectionChanged,
    isLimit: isLimitChanged,
    isTrigger: isTriggerChanged,
    triggerPrice: isTriggerPriceChanged,
    leverage: isLeverageChanged,
    fromTokenAddress: isFromTokenAddressChanged,
    toTokenAddress: isToTokenAddressChanged,
    fromTokenInputValue: isFromTokenInputValueChanged,
    toTokenInputValue: isToTokenInputValueChanged,
  };
}
