import {
  getKeepLeverageKey,
  getLeverageEnabledKey,
  getLeverageKey,
  getSyntheticsTradeOptionsKey,
} from "config/localStorage";
import { createTradeFlags } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { getIsUnwrap, getIsWrap } from "domain/tokens";
import { BigNumber } from "ethers";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";
import { useSafeState } from "lib/useSafeState";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarketsInfoData } from "../markets";
import { OrderType } from "../orders/types";
import { PositionInfo, PositionsInfoData } from "../positions";
import { TokensData } from "../tokens";
import { TradeMode, TradeType, TriggerThresholdType } from "./types";
import { useAvailableTokenOptions } from "./useAvailableTokenOptions";

type TradeStage = "trade" | "confirmation" | "processing";

type TradeOptions = {
  tradeType?: TradeType;
  tradeMode?: TradeMode;
  fromTokenAddress?: string;
  toTokenAddress?: string;
  marketAddress?: string;
  collateralAddress?: string;
};

export type TradeboxState = ReturnType<typeof useTradeboxState>;

type StoredTradeOptions = {
  tradeType: TradeType;
  tradeMode: TradeMode;
  tokens: {
    fromTokenAddress?: string;
    swapToTokenAddress?: string;
    indexTokenAddress?: string;
  };
  markets: {
    [indexTokenAddress: string]: {
      long: string;
      short: string;
    };
  };
  collateralAddress?: string;
};

export function useTradeboxState(
  chainId: number,
  p: {
    marketsInfoData?: MarketsInfoData;
    positionsInfoData?: PositionsInfoData;
    tokensData?: TokensData;
  }
) {
  const { marketsInfoData, positionsInfoData, tokensData } = p;

  const [storedOptions, setStoredOptions] = useLocalStorageSerializeKey<StoredTradeOptions>(
    getSyntheticsTradeOptionsKey(chainId),
    {
      tradeType: TradeType.Long,
      tradeMode: TradeMode.Market,
      tokens: {},
      markets: {},
      collateralAddress: undefined,
    }
  );

  const [fromTokenInputValue, setFromTokenInputValue] = useSafeState("");
  const [toTokenInputValue, setToTokenInputValue] = useSafeState("");
  const [stage, setStage] = useState<TradeStage>("trade");
  const [focusedInput, setFocusedInput] = useState<"from" | "to">();
  const [fixedTriggerThresholdType, setFixedTriggerThresholdType] = useState<TriggerThresholdType>();
  const [fixedTriggerOrderType, setFixedTriggerOrderType] = useState<
    OrderType.LimitDecrease | OrderType.StopLossDecrease
  >();
  const [defaultTriggerAcceptablePriceImpactBps, setDefaultTriggerAcceptablePriceImpactBps] = useState<BigNumber>();
  const [selectedTriggerAcceptablePriceImpactBps, setSelectedTriggerAcceptablePriceImpactBps] = useState<BigNumber>();
  const [closeSizeInputValue, setCloseSizeInputValue] = useState("");
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState<string>("");
  const [triggerRatioInputValue, setTriggerRatioInputValue] = useState<string>("");

  const availableTokensOptions = useAvailableTokenOptions(chainId, { marketsInfoData, tokensData });
  const { swapTokens, indexTokens } = availableTokensOptions;

  const tradeType = storedOptions?.tradeType;
  const tradeMode = storedOptions?.tradeMode;

  const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey(getLeverageKey(chainId), 2);
  const [isLeverageEnabled, setIsLeverageEnabled] = useLocalStorageSerializeKey(getLeverageEnabledKey(chainId), true);
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey(getKeepLeverageKey(chainId), true);

  const avaialbleTradeModes = useMemo(() => {
    if (!tradeType) {
      return [];
    }

    return {
      [TradeType.Long]: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger],
      [TradeType.Short]: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger],
      [TradeType.Swap]: [TradeMode.Market, TradeMode.Limit],
    }[tradeType];
  }, [tradeType]);

  const tradeFlags = useMemo(() => createTradeFlags(tradeType!, tradeMode!), [tradeType, tradeMode]);
  const { isSwap, isLong, isPosition } = tradeFlags;

  const fromTokenAddress = storedOptions?.tokens.fromTokenAddress;
  const fromToken = getByKey(tokensData, fromTokenAddress);

  const toTokenAddress = tradeFlags.isSwap
    ? storedOptions!.tokens.swapToTokenAddress
    : storedOptions!.tokens.indexTokenAddress;
  const toToken = getByKey(tokensData, toTokenAddress);

  const isWrapOrUnwrap = Boolean(
    isSwap && fromToken && toToken && (getIsWrap(fromToken, toToken) || getIsUnwrap(fromToken, toToken))
  );

  const marketAddress = toTokenAddress
    ? storedOptions!.markets[toTokenAddress]?.[tradeFlags.isLong ? "long" : "short"]
    : undefined;
  const marketInfo = getByKey(marketsInfoData, marketAddress);

  const collateralAddress = storedOptions?.collateralAddress;
  const collateralToken = getByKey(tokensData, collateralAddress);

  const setTradeType = useCallback(
    (tradeType: TradeType) => {
      const oldState = JSON.parse(JSON.stringify(storedOptions));
      oldState.tradeType = tradeType;
      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions]
  );

  const setTradeMode = useCallback(
    (tradeMode: TradeMode) => {
      const oldState = JSON.parse(JSON.stringify(storedOptions));
      oldState.tradeMode = tradeMode;
      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions]
  );

  const setFromTokenAddress = useCallback(
    (tokenAddress?: string) => {
      const oldState = JSON.parse(JSON.stringify(storedOptions));

      oldState.tokens.fromTokenAddress = tokenAddress;
      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions]
  );

  const setToTokenAddress = useCallback(
    (tokenAddress?: string, marketTokenAddress?: string, tradeType?: TradeType) => {
      const oldState = JSON.parse(JSON.stringify(storedOptions)) as StoredTradeOptions;

      if (tradeType) {
        oldState.tradeType = tradeType;
      }

      if (tradeFlags.isSwap) {
        oldState.tokens.swapToTokenAddress = tokenAddress;
      } else {
        oldState.tokens.indexTokenAddress = tokenAddress;
        if (tokenAddress && marketTokenAddress) {
          oldState.markets[tokenAddress] = oldState.markets[tokenAddress] || {};
          if (oldState.tradeType === TradeType.Long) {
            oldState.markets[tokenAddress].long = marketTokenAddress;
          } else if (oldState.tradeType === TradeType.Short) {
            oldState.markets[tokenAddress].short = marketTokenAddress;
          }
        }
      }

      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions, tradeFlags.isSwap]
  );

  const switchTokenAddresses = useCallback(() => {
    const oldState = JSON.parse(JSON.stringify(storedOptions));

    oldState.tokens.fromTokenAddress = toTokenAddress;

    if (tradeFlags.isSwap) {
      oldState.tokens.swapToTokenAddress = fromTokenAddress;
    } else {
      oldState.tokens.indexTokenAddress = fromTokenAddress;
    }

    setStoredOptions(oldState);
  }, [fromTokenAddress, setStoredOptions, storedOptions, toTokenAddress, tradeFlags.isSwap]);

  const setMarketAddress = useCallback(
    (marketAddress?: string) => {
      const oldState = JSON.parse(JSON.stringify(storedOptions));
      if (!toTokenAddress) {
        return;
      }

      oldState.markets[toTokenAddress] = oldState.markets[toTokenAddress] || {};

      if (tradeFlags.isLong) {
        oldState.markets[toTokenAddress].long = marketAddress;
      } else {
        oldState.markets[toTokenAddress].short = marketAddress;
      }

      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions, toTokenAddress, tradeFlags.isLong]
  );

  const setActivePosition = useCallback(
    (position?: PositionInfo, tradeMode?: TradeMode) => {
      if (!position) {
        return;
      }

      const oldState: StoredTradeOptions = JSON.parse(JSON.stringify(storedOptions));

      if (tradeMode) {
        oldState.tradeMode = tradeMode;
      }
      oldState.tradeType = position.isLong ? TradeType.Long : TradeType.Short;
      oldState.tokens.indexTokenAddress = position.indexToken.address;
      oldState.markets[oldState.tokens.indexTokenAddress] = oldState.markets[oldState.tokens.indexTokenAddress] || {};
      oldState.markets[oldState.tokens.indexTokenAddress][position.isLong ? "long" : "short"] = position.marketAddress;
      oldState.collateralAddress = position.collateralToken.address;

      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions]
  );

  const setCollateralAddress = useCallback(
    (tokenAddress?: string) => {
      const oldState = JSON.parse(JSON.stringify(storedOptions));

      oldState.collateralAddress = tokenAddress;

      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions]
  );

  const setTradeConfig = useCallback(
    (tradeOptions: TradeOptions) => {
      const { tradeType, tradeMode, fromTokenAddress, toTokenAddress, marketAddress, collateralAddress } = tradeOptions;
      const oldState = JSON.parse(JSON.stringify(storedOptions));

      if (tradeType) {
        oldState.tradeType = tradeType;
      }

      if (tradeMode) {
        oldState.tradeMode = tradeMode;
      }

      if (fromTokenAddress) {
        oldState.tokens.fromTokenAddress = fromTokenAddress;
      }

      if (toTokenAddress) {
        if (oldState.tradeType === TradeType.Swap) {
          oldState.tokens.swapToTokenAddress = toTokenAddress;
        } else {
          oldState.tokens.indexTokenAddress = toTokenAddress;
          if (toTokenAddress && marketAddress) {
            oldState.markets[toTokenAddress] = oldState.markets[toTokenAddress] || {};
            if (oldState.tradeType === TradeType.Long) {
              oldState.markets[toTokenAddress].long = marketAddress;
            } else if (oldState.tradeType === TradeType.Short) {
              oldState.markets[toTokenAddress].short = marketAddress;
            }
          }
        }
      }

      if (collateralAddress) {
        oldState.collateralAddress = collateralAddress;
      }

      setStoredOptions(oldState);
    },
    [setStoredOptions, storedOptions]
  );

  useEffect(
    function updateTradeMode() {
      if (tradeType && tradeMode && !avaialbleTradeModes.includes(tradeMode)) {
        setTradeMode(avaialbleTradeModes[0]);
      }
    },
    [tradeType, tradeMode, avaialbleTradeModes, setTradeMode]
  );

  useEffect(
    function updateSwapTokens() {
      if (!isSwap || !swapTokens.length) {
        return;
      }

      const needFromUpdate = !swapTokens.find((t) => t.address === fromTokenAddress);

      if (needFromUpdate) {
        setFromTokenAddress(swapTokens[0].address);
      }

      const needToUpdate = !swapTokens.find((t) => t.address === toTokenAddress);

      if (needToUpdate) {
        setToTokenAddress(swapTokens[0].address);
      }
    },
    [fromTokenAddress, isSwap, setFromTokenAddress, setToTokenAddress, swapTokens, toTokenAddress]
  );

  useEffect(
    function updatePositionTokens() {
      if (!isPosition) {
        return;
      }

      const needFromUpdate = !swapTokens.find((t) => t.address === fromTokenAddress);
      const nextFromToken = needFromUpdate && swapTokens.length ? swapTokens[0] : fromToken;

      if (nextFromToken && nextFromToken?.address !== fromTokenAddress) {
        setFromTokenAddress(nextFromToken.address);
      }

      const needIndexUpdateByAvailableTokens = !indexTokens.find((t) => t.address === toTokenAddress);

      if (needIndexUpdateByAvailableTokens && indexTokens.length) {
        setToTokenAddress(indexTokens[0].address);
      }

      let needCollateralUpdate = false;

      if (
        !collateralAddress ||
        (marketInfo && ![marketInfo.longTokenAddress, marketInfo.shortTokenAddress].includes(collateralAddress))
      ) {
        needCollateralUpdate = true;
      }

      if (needCollateralUpdate && marketInfo) {
        // Use stable collateral by default
        setCollateralAddress(marketInfo.shortTokenAddress);
      }
    },
    [
      collateralAddress,
      fromToken,
      fromTokenAddress,
      indexTokens,
      isLong,
      isPosition,
      marketInfo,
      positionsInfoData,
      setCollateralAddress,
      setFromTokenAddress,
      setToTokenAddress,
      swapTokens,
      toTokenAddress,
    ]
  );

  return {
    tradeType: tradeType!,
    tradeMode: tradeMode!,
    isWrapOrUnwrap,
    fromTokenAddress,
    toTokenAddress,
    marketAddress,
    marketInfo,
    collateralAddress,
    collateralToken,
    availableTokensOptions,
    avaialbleTradeModes,
    setActivePosition,
    setFromTokenAddress,
    setToTokenAddress,
    setMarketAddress,
    setCollateralAddress,
    setTradeType,
    setTradeMode,
    switchTokenAddresses,
    setTradeConfig,
    fromTokenInputValue,
    setFromTokenInputValue,
    toTokenInputValue,
    setToTokenInputValue,
    stage,
    setStage,
    focusedInput,
    setFocusedInput,
    fixedTriggerThresholdType,
    setFixedTriggerThresholdType,
    fixedTriggerOrderType,
    setFixedTriggerOrderType,
    defaultTriggerAcceptablePriceImpactBps,
    setDefaultTriggerAcceptablePriceImpactBps,
    selectedTriggerAcceptablePriceImpactBps,
    setSelectedAcceptablePriceImpactBps: setSelectedTriggerAcceptablePriceImpactBps,
    closeSizeInputValue,
    setCloseSizeInputValue,
    triggerPriceInputValue,
    setTriggerPriceInputValue,
    triggerRatioInputValue,
    setTriggerRatioInputValue,
    leverageOption,
    setLeverageOption,
    isLeverageEnabled,
    setIsLeverageEnabled,
    keepLeverage,
    setKeepLeverage,
  };
}
