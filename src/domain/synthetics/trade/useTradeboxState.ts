import get from "lodash/get";
import mapValues from "lodash/mapValues";
import { SetStateAction, useCallback, useEffect, useMemo, useState } from "react";

import {
  getKeepLeverageKey,
  getLeverageEnabledKey,
  getLeverageKey,
  getSyntheticsTradeOptionsKey,
} from "config/localStorage";
import { getTokenBySymbolSafe, getToken, isSimilarToken } from "config/tokens";
import { createTradeFlags } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { createGetMaxLongShortLiquidityPool } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { getIsUnwrap, getIsWrap } from "domain/tokens";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { EMPTY_OBJECT, getByKey } from "lib/objects";
import { useSafeState } from "lib/useSafeState";
import { entries, keyBy, set, values, merge } from "lodash";
import { MarketsInfoData } from "../markets";
import { chooseSuitableMarket } from "../markets/chooseSuitableMarket";
import { OrderType } from "../orders/types";
import { PositionInfo, PositionsInfoData } from "../positions";
import { TokensData } from "../tokens";
import { TradeMode, TradeType, TriggerThresholdType } from "./types";
import { useAvailableTokenOptions } from "./useAvailableTokenOptions";
import { MarketInfo } from "domain/synthetics/markets";

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
  collaterals?: {
    [marketAddress: string]: {
      long?: string;
      short?: string;
    };
  };
};

const INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE: StoredTradeOptions = {
  tradeType: TradeType.Long,
  tradeMode: TradeMode.Market,
  tokens: {},
  markets: {},
  collaterals: {},
};

export function useTradeboxState(
  chainId: number,
  p: {
    marketsInfoData?: MarketsInfoData;
    positionsInfoData?: PositionsInfoData;
    tokensData?: TokensData;
  }
) {
  const { marketsInfoData, tokensData, positionsInfoData } = p;

  const availableTokensOptions = useAvailableTokenOptions(chainId, { marketsInfoData, tokensData });

  const availableSwapTokenAddresses = useMemo(
    () => availableTokensOptions.swapTokens.map((t) => t.address),
    [availableTokensOptions.swapTokens]
  );

  const availableIndexTokensAddresses = useMemo(
    () => availableTokensOptions.indexTokens.map((t) => t.address),
    [availableTokensOptions.indexTokens]
  );

  const marketAddressIndexTokenMap = useMemo(
    () =>
      availableTokensOptions.sortedAllMarkets
        ? mapValues(
            keyBy(availableTokensOptions.sortedAllMarkets, (market) => market.marketTokenAddress),
            (market) => market.indexToken.address
          )
        : EMPTY_OBJECT,
    [availableTokensOptions.sortedAllMarkets]
  );

  // eslint-disable-next-line react/hook-use-state
  const [storedOptions, setStoredOptionsWithoutFallbacks] = useState<StoredTradeOptions>(() => {
    const raw = localStorage.getItem(JSON.stringify(getSyntheticsTradeOptionsKey(chainId)));

    if (!raw) {
      localStorage.setItem(
        JSON.stringify(getSyntheticsTradeOptionsKey(chainId)),
        JSON.stringify(INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE)
      );
      return INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE;
    }

    return JSON.parse(raw) as StoredTradeOptions;
  });

  const setStoredOptionsOnChain = useCallback(
    (args: SetStateAction<StoredTradeOptions>) => {
      setStoredOptionsWithoutFallbacks((oldState) => {
        const newState = copy(typeof args === "function" ? args(oldState) : args);

        localStorage.setItem(JSON.stringify(getSyntheticsTradeOptionsKey(chainId)), JSON.stringify(newState));

        return newState;
      });
    },
    [chainId]
  );

  const [syncedChainId, setSyncedChainId] = useState<number | undefined>(undefined);
  useEffect(
    function handleChainChange() {
      if (syncedChainId === chainId) {
        return;
      }

      const raw = localStorage.getItem(JSON.stringify(getSyntheticsTradeOptionsKey(chainId)));

      if (raw) {
        if (availableIndexTokensAddresses.length === 0) {
          return;
        }

        const saved = JSON.parse(raw) as StoredTradeOptions;

        if (saved.tokens.indexTokenAddress && availableIndexTokensAddresses.includes(saved.tokens.indexTokenAddress)) {
          setStoredOptionsOnChain(saved);
          setSyncedChainId(chainId);
          return;
        }
      }

      const market = availableTokensOptions.sortedAllMarkets?.at(0);

      if (!market) {
        return;
      }

      setStoredOptionsOnChain({
        ...INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE,
        markets: {
          [market.marketTokenAddress]: {
            long: market.longTokenAddress,
            short: market.shortTokenAddress,
          },
        },
        tokens: {
          indexTokenAddress: market.indexTokenAddress,
          fromTokenAddress: market.shortTokenAddress,
        },
      });
      setSyncedChainId(chainId);
    },
    [
      availableIndexTokensAddresses,
      availableTokensOptions.sortedAllMarkets,
      chainId,
      setStoredOptionsOnChain,
      syncedChainId,
    ]
  );

  const setStoredOptions = useCallback(
    (args: SetStateAction<StoredTradeOptions>) => {
      setStoredOptionsOnChain((oldState) => {
        let newState = copy(typeof args === "function" ? args(oldState) : args);

        if (newState && (newState.tradeType === TradeType.Long || newState.tradeType === TradeType.Short)) {
          fallbackPositionTokens(
            chainId,
            oldState,
            newState,
            availableSwapTokenAddresses,
            availableTokensOptions.sortedAllMarkets
          );
          fallbackCollateralTokens(newState, marketsInfoData);
        }

        return newState;
      });
    },
    [
      chainId,
      availableSwapTokenAddresses,
      setStoredOptionsOnChain,
      marketsInfoData,
      availableTokensOptions.sortedAllMarkets,
    ]
  );

  const [fromTokenInputValue, setFromTokenInputValue] = useSafeState("");
  const [toTokenInputValue, setToTokenInputValue] = useSafeState("");
  const [stage, setStage] = useState<TradeStage>("trade");
  const [focusedInput, setFocusedInput] = useState<"from" | "to">();
  const [fixedTriggerThresholdType, setFixedTriggerThresholdType] = useState<TriggerThresholdType>();
  const [fixedTriggerOrderType, setFixedTriggerOrderType] = useState<
    OrderType.LimitDecrease | OrderType.StopLossDecrease
  >();
  const [defaultTriggerAcceptablePriceImpactBps, setDefaultTriggerAcceptablePriceImpactBps] = useState<bigint>();
  const [selectedTriggerAcceptablePriceImpactBps, setSelectedTriggerAcceptablePriceImpactBps] = useState<bigint>();
  const [closeSizeInputValue, setCloseSizeInputValue] = useState("");
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState<string>("");
  const [triggerRatioInputValue, setTriggerRatioInputValue] = useState<string>("");

  const { swapTokens } = availableTokensOptions;

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

  const tradeFlags = useMemo(() => createTradeFlags(tradeType, tradeMode), [tradeType, tradeMode]);
  const { isSwap } = tradeFlags;

  const fromTokenAddress = storedOptions?.tokens.fromTokenAddress;
  const fromToken = getByKey(tokensData, fromTokenAddress);

  const toTokenAddress = tradeFlags.isSwap
    ? storedOptions?.tokens.swapToTokenAddress
    : storedOptions?.tokens.indexTokenAddress;
  const toToken = getByKey(tokensData, toTokenAddress);

  const isWrapOrUnwrap = Boolean(
    isSwap && fromToken && toToken && (getIsWrap(fromToken, toToken) || getIsUnwrap(fromToken, toToken))
  );

  const longOrShort = tradeFlags.isLong ? "long" : "short";
  const marketAddress = toTokenAddress ? storedOptions?.markets[toTokenAddress]?.[longOrShort] : undefined;
  const marketInfo = getByKey(marketsInfoData, marketAddress);

  const collateralAddress = marketAddress && get(storedOptions, ["collaterals", marketAddress, longOrShort]);
  const collateralToken = getByKey(tokensData, collateralAddress);

  const getMaxLongShortLiquidityPool = useMemo(
    () => createGetMaxLongShortLiquidityPool(availableTokensOptions.sortedAllMarkets || []),
    [availableTokensOptions.sortedAllMarkets]
  );
  const setTradeType = useCallback(
    (tradeType: TradeType) => {
      setStoredOptions((oldState) => {
        const newState = copy(oldState);
        const tokenAddress = newState.tokens.indexTokenAddress;
        if (!tokenAddress) {
          return newState;
        }
        const token = getByKey(tokensData, tokenAddress);

        if (!token) return newState;

        const { maxLongLiquidityPool, maxShortLiquidityPool } = getMaxLongShortLiquidityPool(token);

        const patch = chooseSuitableMarket({
          indexTokenAddress: tokenAddress,
          maxLongLiquidityPool,
          maxShortLiquidityPool,
          isSwap: tradeType === TradeType.Swap,
          positionsInfo: positionsInfoData,
          preferredTradeType: tradeType,
          currentTradeType: newState.tradeType,
        });

        if (!patch) {
          return newState;
        }

        // Noop: as index token is the same
        set(newState, ["tokens", "indexTokenAddress"], patch.indexTokenAddress);
        set(newState, ["tradeType"], tradeType);
        const longOrShort = tradeType === TradeType.Long ? "long" : "short";

        if (patch.marketTokenAddress) {
          set(newState, ["markets", patch.indexTokenAddress, longOrShort], patch.marketTokenAddress);

          if (patch.collateralTokenAddress) {
            set(newState, ["collaterals", patch.marketTokenAddress, longOrShort], patch.collateralTokenAddress);
          }
        }

        return newState;
      });
    },
    [getMaxLongShortLiquidityPool, positionsInfoData, setStoredOptions, tokensData]
  );

  const setTradeMode = useCallback(
    (tradeMode: TradeMode) => {
      setStoredOptions((oldState) => {
        return {
          ...oldState,
          tradeMode,
        };
      });
    },
    [setStoredOptions]
  );

  const setFromTokenAddress = useCallback(
    (tokenAddress?: string) => {
      setStoredOptions((oldState) => {
        return {
          ...oldState,
          tokens: {
            ...oldState.tokens,
            fromTokenAddress: tokenAddress,
          },
        };
      });
    },
    [setStoredOptions]
  );

  const setToTokenAddress = useCallback(
    function setToTokenAddressCallback(tokenAddress: string, marketTokenAddress?: string, tradeType?: TradeType) {
      setStoredOptions(setToTokenAddressUpdaterBuilder(tradeType, tokenAddress, marketTokenAddress));
    },
    [setStoredOptions]
  );

  const switchTokenAddresses = useCallback(() => {
    setStoredOptions((oldState) => {
      if (oldState.tradeType === TradeType.Swap) {
        return {
          ...oldState,
          tokens: {
            ...oldState.tokens,
            fromTokenAddress: oldState.tokens.swapToTokenAddress,
            swapToTokenAddress: oldState.tokens.fromTokenAddress,
          },
        };
      }

      return {
        ...oldState,
        tokens: {
          ...oldState.tokens,
          fromTokenAddress: oldState.tokens.indexTokenAddress,
          indexTokenAddress: oldState.tokens.fromTokenAddress,
        },
      };
    });
  }, [setStoredOptions]);

  const swappedStoredOptions = useMemo(() => {
    if (storedOptions.tradeType === TradeType.Swap) {
      return {
        ...storedOptions,
        tokens: {
          ...storedOptions.tokens,
          fromTokenAddress: storedOptions.tokens.swapToTokenAddress,
          swapToTokenAddress: storedOptions.tokens.fromTokenAddress,
        },
      };
    }

    return {
      ...storedOptions,
      tokens: {
        ...storedOptions.tokens,
        fromTokenAddress: storedOptions.tokens.indexTokenAddress,
        indexTokenAddress: storedOptions.tokens.fromTokenAddress,
      },
    };
  }, [storedOptions]);

  const isSwitchTokensAllowed = useMemo(() => {
    if (storedOptions.tradeType === TradeType.Swap) {
      return true;
    }

    const swappedOptionsWithFallback = fallbackPositionTokens(
      chainId,
      storedOptions,
      {
        ...storedOptions,
        tokens: {
          ...storedOptions.tokens,
          fromTokenAddress: storedOptions.tokens.indexTokenAddress,
          indexTokenAddress: storedOptions.tokens.fromTokenAddress,
        },
      },
      availableSwapTokenAddresses,
      availableTokensOptions.sortedAllMarkets
    );

    const targetPayAddress = swappedStoredOptions.tokens.fromTokenAddress;
    const nextPayAddress = swappedOptionsWithFallback.tokens.fromTokenAddress;

    const targetToAddress = swappedStoredOptions.tokens.indexTokenAddress;
    const nextToAddress = swappedOptionsWithFallback.tokens.indexTokenAddress;

    if (!targetPayAddress || !nextPayAddress || !targetToAddress || !nextToAddress) {
      return false;
    }

    return (
      isSimilarToken(getToken(chainId, targetPayAddress), getToken(chainId, nextPayAddress)) ||
      isSimilarToken(getToken(chainId, targetToAddress), getToken(chainId, nextToAddress))
    );
  }, [
    chainId,
    storedOptions,
    availableSwapTokenAddresses,
    availableTokensOptions.sortedAllMarkets,
    swappedStoredOptions.tokens.fromTokenAddress,
    swappedStoredOptions.tokens.indexTokenAddress,
  ]);

  const setMarketAddress = useCallback(
    (marketAddress?: string) => {
      setStoredOptions((oldState) => {
        const toTokenAddress = oldState.tokens.indexTokenAddress;
        const isLong = oldState.tradeType === TradeType.Long;
        if (!toTokenAddress) {
          return oldState;
        }

        return {
          ...oldState,
          markets: {
            ...oldState.markets,
            [toTokenAddress]: {
              ...oldState.markets[toTokenAddress],
              [isLong ? "long" : "short"]: marketAddress,
            },
          },
        };
      });
    },
    [setStoredOptions]
  );

  const setActivePosition = useCallback(
    (position?: PositionInfo, tradeMode?: TradeMode) => {
      setStoredOptions((oldState) => {
        if (!position) {
          return oldState;
        }

        const newState: StoredTradeOptions = copy(oldState);

        if (tradeMode) {
          newState.tradeMode = tradeMode;
        }

        newState.tradeType = position.isLong ? TradeType.Long : TradeType.Short;
        const newIndexTokenAddress = position.indexToken.address;
        newState.tokens.indexTokenAddress = newIndexTokenAddress;
        newState.markets[newIndexTokenAddress] = newState.markets[newIndexTokenAddress] || {};
        newState.markets[newIndexTokenAddress][position.isLong ? "long" : "short"] = position.marketAddress;
        set(
          newState,
          ["collaterals", position.marketAddress, position.isLong ? "long" : "short"],
          position.collateralTokenAddress
        );

        return newState;
      });
    },
    [setStoredOptions]
  );

  const setCollateralAddress = useCallback(
    function setCollateralAddressCallback(tokenAddress?: string) {
      setStoredOptions(function setCollateralAddressUpdater(oldState: StoredTradeOptions): StoredTradeOptions {
        const newState = copy(oldState);

        if (!newState.tokens.indexTokenAddress) {
          return newState;
        }

        const longOrShort = newState.tradeType === TradeType.Long ? "long" : "short";
        const currentMarket = newState.markets[newState.tokens.indexTokenAddress][longOrShort];

        set(newState, ["collaterals", currentMarket, longOrShort], tokenAddress);

        return newState;
      });
    },
    [setStoredOptions]
  );

  const setTradeConfig = useCallback(
    function setTradeConfigCallback(tradeOptions: TradeOptions) {
      setStoredOptions(function setTradeConfigUpdater(oldState: StoredTradeOptions) {
        const { tradeType, tradeMode, fromTokenAddress, toTokenAddress, marketAddress, collateralAddress } =
          tradeOptions;

        if (!oldState) {
          return oldState;
        }

        const newState = copy(oldState);

        if (tradeType) {
          newState.tradeType = tradeType;
        }

        if (tradeMode) {
          newState.tradeMode = tradeMode;
        }

        if (fromTokenAddress) {
          newState.tokens.fromTokenAddress = fromTokenAddress;
        }

        if (toTokenAddress) {
          if (tradeType === TradeType.Swap) {
            newState.tokens.swapToTokenAddress = toTokenAddress;
          } else {
            newState.tokens.indexTokenAddress = toTokenAddress;
            if (toTokenAddress && marketAddress) {
              newState.markets[toTokenAddress] = newState.markets[toTokenAddress] || {};
              if (tradeType === TradeType.Long) {
                newState.markets[toTokenAddress].long = marketAddress;
              } else if (tradeType === TradeType.Short) {
                newState.markets[toTokenAddress].short = marketAddress;
              }
            }
          }
        }

        if (collateralAddress && marketAddress) {
          const longOrShort = tradeType === TradeType.Long ? "long" : "short";

          set(newState, ["collaterals", marketAddress, longOrShort], collateralAddress);
        }

        return newState;
      });
    },
    [setStoredOptions]
  );

  useEffect(
    function fallbackStoredOptions() {
      if (availableSwapTokenAddresses.length === 0 && values(marketAddressIndexTokenMap).length === 0) {
        return;
      }

      if (values(marketsInfoData).length === 0) {
        return;
      }

      setStoredOptions(copy);
    },
    [availableSwapTokenAddresses.length, marketAddressIndexTokenMap, marketsInfoData, setStoredOptions]
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

  return {
    tradeType,
    tradeMode,
    isWrapOrUnwrap,
    fromTokenAddress,
    toTokenAddress,
    marketAddress,
    marketInfo,
    collateralAddress,
    collateralToken,
    availableTokensOptions,
    avaialbleTradeModes,
    isSwitchTokensAllowed,
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

function setToTokenAddressUpdaterBuilder(
  tradeType: TradeType | undefined,
  tokenAddress: string,
  marketTokenAddress: string | undefined
): (oldState: StoredTradeOptions) => StoredTradeOptions {
  return function setToTokenAddressUpdater(oldState: StoredTradeOptions): StoredTradeOptions {
    const isSwap = oldState.tradeType === TradeType.Swap;
    const newState = copy(oldState);
    if (!newState) {
      return newState;
    }

    if (tradeType) {
      newState.tradeType = tradeType;
    }

    if (isSwap) {
      newState.tokens.swapToTokenAddress = tokenAddress;
    } else {
      newState.tokens.indexTokenAddress = tokenAddress;
      if (tokenAddress && marketTokenAddress) {
        newState.markets[tokenAddress] = newState.markets[tokenAddress] || {};
        if (newState.tradeType === TradeType.Long) {
          newState.markets[tokenAddress].long = marketTokenAddress;
        } else if (newState.tradeType === TradeType.Short) {
          newState.markets[tokenAddress].short = marketTokenAddress;
        }
      }
    }

    return newState;
  };
}

/**
 * This function does not care about user's positions, fees, sizes, etc.
 * It must set any suitable token and market addresses combination in case it is not correct.
 */
function fallbackPositionTokens(
  chainId: number,
  prevState: StoredTradeOptions,
  nextState: StoredTradeOptions,
  allowedPayTokens: string[],
  allowedMarkets: MarketInfo[]
) {
  const allowedPayTokensSet = new Set(allowedPayTokens);
  const allowedIndexTokenToMarketMap = new Map(entries(keyBy(allowedMarkets, (m) => m.indexToken.address)));

  const nextPayTokenAddress = nextState.tokens.fromTokenAddress;
  const nextIndexTokenAddress = nextState.tokens.indexTokenAddress;

  const isNextPayTokenValid = nextPayTokenAddress && allowedPayTokensSet.has(nextPayTokenAddress);
  const isNextIndexTokenValid = nextIndexTokenAddress && allowedIndexTokenToMarketMap.has(nextIndexTokenAddress);

  const fallbackPayToken = (fallbackPayToken?: string) => {
    return merge(nextState, {
      tokens: {
        fromTokenAddress: fallbackPayToken ?? prevState.tokens.fromTokenAddress,
      },
    });
  };

  const fallbackIndexToken = (fallbackIndexToken?: string) => {
    if (!fallbackIndexToken || !allowedIndexTokenToMarketMap.has(fallbackIndexToken)) {
      return merge(nextState, {
        tokens: {
          indexTokenAddress: prevState.tokens.indexTokenAddress,
        },
      });
    }

    const indexTokenMarketAddress = allowedIndexTokenToMarketMap.get(fallbackIndexToken)!.marketTokenAddress;

    const updater = setToTokenAddressUpdaterBuilder(nextState.tradeType, fallbackIndexToken, indexTokenMarketAddress);

    return updater(nextState);
  };

  if (isNextPayTokenValid && isNextIndexTokenValid) {
    return nextState;
  }

  if (!isNextPayTokenValid) {
    let fallbackPayTokenAddress = prevState.tokens.fromTokenAddress;

    if (nextPayTokenAddress) {
      const desirablePayToken = getToken(chainId, nextPayTokenAddress);

      if (desirablePayToken && desirablePayToken.symbol) {
        const nonSyntheticToken = getTokenBySymbolSafe(chainId, desirablePayToken.symbol, {
          isSynthetic: false,
          symbolType: "baseSymbol",
        });

        if (nonSyntheticToken && allowedPayTokensSet.has(nonSyntheticToken.address)) {
          fallbackPayTokenAddress = nonSyntheticToken.address;
        }
      }
    }

    fallbackPayToken(fallbackPayTokenAddress);
  }

  if (!isNextIndexTokenValid) {
    let fallbackIndexTokenAddress = prevState.tokens.indexTokenAddress;

    if (nextIndexTokenAddress) {
      const desirableIndexToken = getToken(chainId, nextIndexTokenAddress);

      if (desirableIndexToken && desirableIndexToken.baseSymbol) {
        const syntheticToken = getTokenBySymbolSafe(chainId, desirableIndexToken.baseSymbol, {
          isSynthetic: true,
          symbolType: "symbol",
        });

        if (syntheticToken && allowedIndexTokenToMarketMap.has(syntheticToken.address)) {
          fallbackIndexTokenAddress = syntheticToken?.address;
        }
      }
    }

    fallbackIndexToken(fallbackIndexTokenAddress);
  }

  const isFallbackPayTokenValid =
    nextState.tokens.fromTokenAddress && allowedPayTokensSet.has(nextState.tokens.fromTokenAddress);
  const isFallbackIndexTokenValid =
    nextState.tokens.indexTokenAddress && allowedIndexTokenToMarketMap.has(nextState.tokens.indexTokenAddress);

  if (!isFallbackPayTokenValid && !isFallbackIndexTokenValid) {
    fallbackPayToken(prevState.tokens.fromTokenAddress);
    fallbackIndexToken(prevState.tokens.indexTokenAddress);
  }

  return nextState;
}

function fallbackCollateralTokens(newState: StoredTradeOptions, marketsInfoData: MarketsInfoData | undefined): void {
  const longOrShort = newState.tradeType === TradeType.Long ? "long" : "short";
  const toTokenAddress =
    newState.tradeType === TradeType.Swap ? newState.tokens.swapToTokenAddress : newState.tokens.indexTokenAddress;
  const marketAddress = toTokenAddress ? newState.markets[toTokenAddress]?.[longOrShort] : undefined;

  if (!marketAddress) {
    return;
  }

  const marketInfo = getByKey(marketsInfoData, marketAddress);
  const collateralUserCache = get(newState, ["collaterals", marketAddress, longOrShort]);

  const currentCollateralIncludedInCurrentMarket =
    marketInfo &&
    (marketInfo.longTokenAddress === collateralUserCache || marketInfo.shortTokenAddress === collateralUserCache);

  const needCollateralUpdate = !collateralUserCache || !currentCollateralIncludedInCurrentMarket;

  if (needCollateralUpdate && marketInfo) {
    const isLongTokenStable = marketInfo.longToken.isStable;
    const isShortTokenStable = marketInfo.shortToken.isStable;
    let collateralAddress: string | undefined;

    if (marketInfo.longTokenAddress === marketInfo.shortTokenAddress) {
      collateralAddress = marketInfo.shortTokenAddress;
    } else if (isLongTokenStable && !isShortTokenStable) {
      collateralAddress = marketInfo.longTokenAddress;
    } else if (!isLongTokenStable && isShortTokenStable) {
      collateralAddress = marketInfo.shortTokenAddress;
    } else if (newState.tradeType === TradeType.Long) {
      collateralAddress = marketInfo.longTokenAddress;
    } else if (newState.tradeType === TradeType.Short) {
      collateralAddress = marketInfo.shortTokenAddress;
    }

    set(newState, ["collaterals", marketAddress, longOrShort], collateralAddress);
  }
}

function copy<T extends object>(obj: T): T {
  return { ...obj };
}
