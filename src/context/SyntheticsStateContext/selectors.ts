import { createSelector as createSelectorCommon } from "lib/selectors";
import { SyntheticsState, useSyntheticsStateSelector as useSelector } from "./SyntheticsStateContextProvider";
import { getPositionKey } from "lib/legacy";
import { TradeFlags, TradeMode, TradeType } from "domain/synthetics/trade";
import { isSwapOrderType } from "domain/synthetics/orders";
import { getByKey } from "lib/objects";

const createSelector = createSelectorCommon.withTypes<SyntheticsState>();

/*
    trade fields:
    tradeType,
    tradeMode,
    tradeFlags,
    isWrapOrUnwrap,
    fromTokenAddress,
    fromToken,
    toTokenAddress,
    toToken,
    marketAddress,
    marketInfo,
    collateralAddress,
    collateralToken,
    availableTokensOptions,
    avaialbleTradeModes,
    setTradeType,
    setTradeMode,
    setFromTokenAddress,
    setToTokenAddress,
    setMarketAddress,
    setCollateralAddress,
    setActivePosition,
    switchTokenAddresses,
*/

// trade
const selectTradeType = (s: SyntheticsState) => s.trade.tradeType;
const selectTradeMode = (s: SyntheticsState) => s.trade.tradeMode;
const selectIsWrapOrUnwrap = (s: SyntheticsState) => s.trade.isWrapOrUnwrap;
const selectFromTokenAddress = (s: SyntheticsState) => s.trade.fromTokenAddress;
const selectFromToken = (s: SyntheticsState) => s.trade.fromToken;
const selectToTokenAddress = (s: SyntheticsState) => s.trade.toTokenAddress;
const selectToToken = (s: SyntheticsState) => s.trade.toToken;
const selectMarketAddress = (s: SyntheticsState) => s.trade.marketAddress;
const selectMarketInfo = (s: SyntheticsState) => s.trade.marketInfo;
const selectCollateralAddress = (s: SyntheticsState) => s.trade.collateralAddress;
const selectCollateralToken = (s: SyntheticsState) => s.trade.collateralToken;
const selectAvailableTokensOptions = (s: SyntheticsState) => s.trade.availableTokensOptions;
const selectAvailableTradeModes = (s: SyntheticsState) => s.trade.avaialbleTradeModes;
const selectSetTradeType = (s: SyntheticsState) => s.trade.setTradeType;
const selectSetTradeMode = (s: SyntheticsState) => s.trade.setTradeMode;
const selectSetFromTokenAddress = (s: SyntheticsState) => s.trade.setFromTokenAddress;
const selectSetToTokenAddress = (s: SyntheticsState) => s.trade.setToTokenAddress;
const selectSetMarketAddress = (s: SyntheticsState) => s.trade.setMarketAddress;
const selectSetCollateralAddress = (s: SyntheticsState) => s.trade.setCollateralAddress;
const selectSetActivePosition = (s: SyntheticsState) => s.trade.setActivePosition;
const selectSwitchTokenAddresses = (s: SyntheticsState) => s.trade.switchTokenAddresses;

// globals
const selectAccount = (s: SyntheticsState) => s.globals.account;
const selectOrdersInfoData = (s: SyntheticsState) => s.globals.ordersInfo.ordersInfoData;
const selectPositionsInfoData = (s: SyntheticsState) => s.globals.positionsInfo.positionsInfoData;

const selectTradeFlags = createSelector(
  [selectTradeType, selectTradeMode],
  (tradeType: TradeType, tradeMode: TradeMode) => {
    const isLong = tradeType === TradeType.Long;
    const isShort = tradeType === TradeType.Short;
    const isSwap = tradeType === TradeType.Swap;
    const isPosition = isLong || isShort;
    const isMarket = tradeMode === TradeMode.Market;
    const isLimit = tradeMode === TradeMode.Limit;
    const isTrigger = tradeMode === TradeMode.Trigger;
    const isIncrease = isPosition && (isMarket || isLimit);

    const tradeFlags: TradeFlags = {
      isLong,
      isShort,
      isSwap,
      isPosition,
      isIncrease,
      isMarket,
      isLimit,
      isTrigger,
    };

    return tradeFlags;
  }
);

const selectSelectedPositionKey = createSelector(
  [selectAccount, selectCollateralAddress, selectMarketAddress, selectTradeFlags],
  (account, collateralAddress, marketAddress, tradeFlags) => {
    if (!account || !collateralAddress || !marketAddress) {
      return undefined;
    }

    return getPositionKey(account, marketAddress, collateralAddress, tradeFlags.isLong);
  }
);

const selectSelectedPosition = createSelector(
  [selectSelectedPositionKey, selectPositionsInfoData],
  (selectedPositionKey, positionsInfoData) => getByKey(positionsInfoData, selectedPositionKey)
);

const selectExistingOrder = createSelector(
  [selectSelectedPositionKey, selectOrdersInfoData],
  (selectedPositionKey, ordersInfoData) => {
    if (!selectedPositionKey) {
      return undefined;
    }

    return Object.values(ordersInfoData || {})
      .filter((order) => !isSwapOrderType(order.orderType))
      .find((order) => {
        if (isSwapOrderType(order.orderType)) {
          return false;
        }

        return (
          getPositionKey(order.account, order.marketAddress, order.targetCollateralToken.address, order.isLong) ===
          selectedPositionKey
        );
      });
  }
);

const selectHasExistingOrder = createSelector([selectExistingOrder], (existingOrder) => !!existingOrder);

// trade
export const useTradeType = () => useSelector(selectTradeType);
export const useTradeMode = () => useSelector(selectTradeMode);
export const useIsWrapOrUnwrap = () => useSelector(selectIsWrapOrUnwrap);
export const useFromTokenAddress = () => useSelector(selectFromTokenAddress);
export const useFromToken = () => useSelector(selectFromToken);
export const useToTokenAddress = () => useSelector(selectToTokenAddress);
export const useToToken = () => useSelector(selectToToken);
export const useMarketAddress = () => useSelector(selectMarketAddress);
export const useMarketInfo = () => useSelector(selectMarketInfo);
export const useCollateralAddress = () => useSelector(selectCollateralAddress);
export const useCollateralToken = () => useSelector(selectCollateralToken);
export const useAvailableTokensOptions = () => useSelector(selectAvailableTokensOptions);
export const useAvailableTradeModes = () => useSelector(selectAvailableTradeModes);
export const useSetTradeType = () => useSelector(selectSetTradeType);
export const useSetTradeMode = () => useSelector(selectSetTradeMode);
export const useSetFromTokenAddress = () => useSelector(selectSetFromTokenAddress);
export const useSetToTokenAddress = () => useSelector(selectSetToTokenAddress);
export const useSetMarketAddress = () => useSelector(selectSetMarketAddress);
export const useSetCollateralAddress = () => useSelector(selectSetCollateralAddress);
export const useSetActivePosition = () => useSelector(selectSetActivePosition);
export const useSwitchTokenAddresses = () => useSelector(selectSwitchTokenAddresses);

export const useSelectedPositionKey = () => useSelector(selectSelectedPositionKey);
export const useSelectedPosition = () => useSelector(selectSelectedPosition);
export const useTradeFlags = () => useSelector(selectTradeFlags);
export const useExistingOrder = () => useSelector(selectExistingOrder);
export const useHasExistingOrder = () => useSelector(selectHasExistingOrder);
