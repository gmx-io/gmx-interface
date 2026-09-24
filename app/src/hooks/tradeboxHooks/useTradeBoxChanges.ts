import {
  selectSetTradeboxFromTokenAddress,
  selectSetTradeboxToTokenAddress,
  selectTradeboxTriggerPriceInputValue,
} from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxTradeLeverage } from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxTradeFlags } from '@/selectors/tradebox/selectTradeboxTradeFlags';
import { selectTradeboxMarketInfo } from '@/selectors/tradebox/selectTradeboxMarketInfo';
import { useAppStore } from '@/zustand/useAppStore';
import { usePrevious } from 'react-use';

export function useTradeboxChanges() {
  const marketInfo = useAppStore(selectTradeboxMarketInfo);
  const leverage = useAppStore(selectTradeboxTradeLeverage);
  const fromTokenAddress = useAppStore(selectSetTradeboxFromTokenAddress);
  const toTokenAddress = useAppStore(selectSetTradeboxToTokenAddress);
  const tradeFlags = useAppStore(selectTradeboxTradeFlags);
  const triggerPrice = useAppStore(selectTradeboxTriggerPriceInputValue);

  const previousMarketIndexTokenAddress = usePrevious(
    marketInfo?.indexTokenAddress
  );
  const previousLeverage = usePrevious(leverage);
  const previousToTokenAddress = usePrevious(toTokenAddress);
  const previousFromTokenAddress = usePrevious(fromTokenAddress);
  const previousTradeIsLong = usePrevious(tradeFlags.isLong);
  const previousIsLimit = usePrevious(tradeFlags.isLimit);
  const previousIsTrigger = usePrevious(tradeFlags.isTrigger);
  const previousIsSwap = usePrevious(tradeFlags.isSwap);
  const previousTriggerPrice = usePrevious(triggerPrice);

  const isMarketChanged =
    previousMarketIndexTokenAddress !== marketInfo?.indexTokenAddress;
  const isLimitChanged = previousIsLimit !== tradeFlags.isLimit;
  const isTriggerChanged = previousIsTrigger !== tradeFlags.isTrigger;
  const isTriggerPriceChanged = triggerPrice !== previousTriggerPrice;
  const isLeverageChanged = previousLeverage !== leverage;
  const isFromTokenAddressChanged =
    previousFromTokenAddress !== fromTokenAddress;
  const isToTokenAddressChanged = previousToTokenAddress !== toTokenAddress;
  const isDirectionChanged =
    previousIsSwap !== tradeFlags.isSwap ||
    previousTradeIsLong !== tradeFlags.isLong;

  return {
    market: isMarketChanged,
    direction: isDirectionChanged,
    isLimit: isLimitChanged,
    isTrigger: isTriggerChanged,
    triggerPrice: isTriggerPriceChanged,
    leverage: isLeverageChanged,
    fromTokenAddress: isFromTokenAddressChanged,
    toTokenAddress: isToTokenAddressChanged,
  };
}
