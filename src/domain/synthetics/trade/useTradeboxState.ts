import get from "lodash/get";
import mapValues from "lodash/mapValues";
import { SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { produce } from "immer";

import {
  getKeepLeverageKey,
  getLeverageEnabledKey,
  getLeverageKey,
  getSyntheticsTradeOptionsKey,
} from "config/localStorage";
import { getToken, isSimilarToken } from "config/tokens";
import { createTradeFlags } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { createGetMaxLongShortLiquidityPool } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { getIsUnwrap, getIsWrap } from "domain/tokens";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { EMPTY_OBJECT, getByKey } from "lib/objects";
import { useSafeState } from "lib/useSafeState";
import { keyBy, set, values } from "lodash";
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
        const newState = typeof args === "function" ? args(oldState) : args;

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
          [market.indexTokenAddress]: {
            long: market.marketTokenAddress,
            short: market.marketTokenAddress,
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
        let newState = typeof args === "function" ? args(oldState) : args;

        if (newState && (newState.tradeType === TradeType.Long || newState.tradeType === TradeType.Short)) {
          newState = fallbackPositionTokens(
            chainId,
            oldState,
            newState,
            availableSwapTokenAddresses,
            availableTokensOptions.sortedAllMarkets
          );
          newState = fallbackCollateralTokens(newState, marketsInfoData);
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
        const tokenAddress = oldState.tokens.indexTokenAddress;
        if (!tokenAddress) {
          return oldState;
        }
        const token = getByKey(tokensData, tokenAddress);

        if (!token) return oldState;

        const { maxLongLiquidityPool, maxShortLiquidityPool } = getMaxLongShortLiquidityPool(token);

        const patch = chooseSuitableMarket({
          indexTokenAddress: tokenAddress,
          maxLongLiquidityPool,
          maxShortLiquidityPool,
          isSwap: tradeType === TradeType.Swap,
          positionsInfo: positionsInfoData,
          preferredTradeType: tradeType,
          currentTradeType: oldState.tradeType,
        });

        if (!patch) {
          return oldState;
        }

        return produce(oldState, (draft) => {
          // Noop: as index token is the same
          set(draft, ["tokens", "indexTokenAddress"], patch.indexTokenAddress);
          set(draft, ["tradeType"], tradeType);
          const longOrShort = tradeType === TradeType.Long ? "long" : "short";

          if (patch.marketTokenAddress) {
            set(draft, ["markets", patch.indexTokenAddress, longOrShort], patch.marketTokenAddress);

            if (patch.collateralTokenAddress) {
              set(draft, ["collaterals", patch.marketTokenAddress, longOrShort], patch.collateralTokenAddress);
            }
          }
        });
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
      setStoredOptions((oldState) =>
        produce(oldState, (draft) => {
          draft.tokens.fromTokenAddress = tokenAddress;
        })
      );
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
    setStoredOptions((oldState) =>
      produce(oldState, (draft) => {
        if (oldState.tradeType === TradeType.Swap) {
          draft.tokens.fromTokenAddress = oldState.tokens.swapToTokenAddress;
          draft.tokens.swapToTokenAddress = oldState.tokens.fromTokenAddress;
        } else {
          draft.tokens.fromTokenAddress = oldState.tokens.indexTokenAddress;
          draft.tokens.indexTokenAddress = oldState.tokens.fromTokenAddress;
        }
      })
    );
  }, [setStoredOptions]);

  const isSwitchTokensAllowed = useMemo(() => {
    if (storedOptions.tradeType === TradeType.Swap) {
      return true;
    }

    const desirablePayAddress = storedOptions.tokens.indexTokenAddress;
    const desirableToAddress = storedOptions.tokens.fromTokenAddress;

    const swappedOptionsWithFallback = fallbackPositionTokens(
      chainId,
      storedOptions,
      {
        ...storedOptions,
        tokens: {
          ...storedOptions.tokens,
          fromTokenAddress: desirablePayAddress,
          indexTokenAddress: desirableToAddress,
        },
      },
      availableSwapTokenAddresses,
      availableTokensOptions.sortedAllMarkets
    );

    const nextPayAddress = swappedOptionsWithFallback.tokens.fromTokenAddress;
    const nextToAddress = swappedOptionsWithFallback.tokens.indexTokenAddress;

    if (!desirablePayAddress || !nextPayAddress || !desirableToAddress || !nextToAddress) {
      return false;
    }

    return (
      isSimilarToken(getToken(chainId, desirablePayAddress), getToken(chainId, nextPayAddress)) ||
      isSimilarToken(getToken(chainId, desirableToAddress), getToken(chainId, nextToAddress))
    );
  }, [chainId, storedOptions, availableSwapTokenAddresses, availableTokensOptions.sortedAllMarkets]);

  const setMarketAddress = useCallback(
    (marketAddress?: string) => {
      setStoredOptions((oldState) => {
        const toTokenAddress = oldState.tokens.indexTokenAddress;
        const isLong = oldState.tradeType === TradeType.Long;
        if (!toTokenAddress || !marketAddress) {
          return oldState;
        }

        return produce(oldState, (draft) => {
          draft.markets[toTokenAddress][isLong ? "long" : "short"] = marketAddress;
        });
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

        return produce(oldState, (draft) => {
          if (tradeMode) {
            draft.tradeMode = tradeMode;
          }

          draft.tradeType = position.isLong ? TradeType.Long : TradeType.Short;
          const newIndexTokenAddress = position.indexToken.address;
          draft.tokens.indexTokenAddress = newIndexTokenAddress;
          draft.markets[newIndexTokenAddress] = draft.markets[newIndexTokenAddress] || {};
          draft.markets[newIndexTokenAddress][position.isLong ? "long" : "short"] = position.marketAddress;
          set(
            draft,
            ["collaterals", position.marketAddress, position.isLong ? "long" : "short"],
            position.collateralTokenAddress
          );
        });
      });
    },
    [setStoredOptions]
  );

  const setCollateralAddress = useCallback(
    function setCollateralAddressCallback(tokenAddress?: string) {
      setStoredOptions(function setCollateralAddressUpdater(oldState: StoredTradeOptions): StoredTradeOptions {
        if (!oldState.tokens.indexTokenAddress) {
          return oldState;
        }

        const longOrShort = oldState.tradeType === TradeType.Long ? "long" : "short";
        const currentMarket = oldState.markets[oldState.tokens.indexTokenAddress][longOrShort];

        return produce(oldState, (draft) => {
          set(draft, ["collaterals", currentMarket, longOrShort], tokenAddress);
        });
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

        return produce(oldState, (draft) => {
          if (tradeType) {
            draft.tradeType = tradeType;
          }

          if (tradeMode) {
            draft.tradeMode = tradeMode;
          }

          if (fromTokenAddress) {
            draft.tokens.fromTokenAddress = fromTokenAddress;
          }

          if (toTokenAddress) {
            if (tradeType === TradeType.Swap) {
              draft.tokens.swapToTokenAddress = toTokenAddress;
            } else {
              draft.tokens.indexTokenAddress = toTokenAddress;
              if (toTokenAddress && marketAddress) {
                draft.markets[toTokenAddress] = draft.markets[toTokenAddress] || {};
                if (tradeType === TradeType.Long) {
                  draft.markets[toTokenAddress].long = marketAddress;
                } else if (tradeType === TradeType.Short) {
                  draft.markets[toTokenAddress].short = marketAddress;
                }
              }
            }
          }

          if (collateralAddress && marketAddress) {
            const longOrShort = tradeType === TradeType.Long ? "long" : "short";

            set(draft, ["collaterals", marketAddress, longOrShort], collateralAddress);
          }
        });
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

      setStoredOptions((oldState) => ({ ...oldState }));
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
    if (!oldState) {
      return oldState;
    }

    const isSwap = oldState.tradeType === TradeType.Swap;

    return produce(oldState, (draft) => {
      if (tradeType) {
        draft.tradeType = tradeType;
      }

      if (isSwap) {
        draft.tokens.swapToTokenAddress = tokenAddress;
      } else {
        draft.tokens.indexTokenAddress = tokenAddress;
        if (tokenAddress && marketTokenAddress) {
          draft.markets[tokenAddress] = draft.markets[tokenAddress] || {};
          if (draft.tradeType === TradeType.Long) {
            draft.markets[tokenAddress].long = marketTokenAddress;
          } else if (draft.tradeType === TradeType.Short) {
            draft.markets[tokenAddress].short = marketTokenAddress;
          }
        }
      }
    });
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
  const longOrShort = nextState.tradeType === TradeType.Long ? "long" : "short";

  const allowedPayTokensSet = new Set(allowedPayTokens);
  const allowedIndexTokens = new Set(allowedMarkets.map((m) => m.indexToken.address));

  const marketsMap = keyBy(allowedMarkets, (m) => m.marketTokenAddress);

  const nextPayTokenAddress = nextState.tokens.fromTokenAddress;
  const nextIndexTokenAddress = nextState.tokens.indexTokenAddress;
  const nextMarketTokenAdress = nextIndexTokenAddress && nextState.markets[nextIndexTokenAddress]?.[longOrShort];

  const isNextPayTokenValid = nextPayTokenAddress && allowedPayTokensSet.has(nextPayTokenAddress);
  const isNextIndexTokenValid = nextIndexTokenAddress && allowedIndexTokens.has(nextIndexTokenAddress);
  const isNextMarketTokenValid =
    nextMarketTokenAdress && marketsMap[nextMarketTokenAdress]?.marketTokenAddress === nextMarketTokenAdress;

  const fallbackPayToken = (fallbackPayToken?: string) => {
    return produce(nextState, (draft) => {
      draft.tokens.fromTokenAddress = fallbackPayToken ?? prevState.tokens.fromTokenAddress;
    });
  };

  const fallbackIndexTokenAndMarket = (fallbackIndexToken?: string) => {
    if (!fallbackIndexToken || !allowedIndexTokens.has(fallbackIndexToken)) {
      return produce(nextState, (draft) => {
        draft.tokens.indexTokenAddress = prevState.tokens.indexTokenAddress;
      });
    }

    const fallbackMarketTokenAddress = nextState.markets[fallbackIndexToken]?.[longOrShort];
    const isValidMarketToken =
      fallbackMarketTokenAddress &&
      marketsMap[fallbackMarketTokenAddress]?.marketTokenAddress === fallbackMarketTokenAddress;

    const fallbackMarketToken = isValidMarketToken
      ? fallbackMarketTokenAddress
      : allowedMarkets.find((m) => m.indexToken.address === fallbackIndexToken)?.marketTokenAddress;

    const updater = setToTokenAddressUpdaterBuilder(nextState.tradeType, fallbackIndexToken, fallbackMarketToken);

    return updater(nextState);
  };

  if (isNextPayTokenValid && isNextIndexTokenValid && isNextMarketTokenValid) {
    return nextState;
  }

  if (!isNextPayTokenValid) {
    let fallbackPayTokenAddress = prevState.tokens.fromTokenAddress;

    if (nextPayTokenAddress) {
      const desirablePayToken = getToken(chainId, nextPayTokenAddress);

      if (desirablePayToken) {
        const similarPayTokenAddress = Array.from(allowedPayTokensSet).find((m) => {
          const indexToken = getToken(chainId, m);

          return isSimilarToken(indexToken, desirablePayToken);
        });

        if (similarPayTokenAddress) {
          fallbackPayTokenAddress = similarPayTokenAddress;
        }
      }
    }

    nextState = fallbackPayToken(fallbackPayTokenAddress);
  }

  if (!isNextIndexTokenValid) {
    let fallbackIndexTokenAddress = prevState.tokens.indexTokenAddress;

    if (nextIndexTokenAddress) {
      const desirableIndexToken = getToken(chainId, nextIndexTokenAddress);

      if (desirableIndexToken) {
        const similarMarket = allowedMarkets.find((m) => {
          const indexToken = getToken(chainId, m.indexTokenAddress);

          return isSimilarToken(indexToken, desirableIndexToken);
        });

        if (similarMarket) {
          fallbackIndexTokenAddress = similarMarket.indexToken.address;
        }
      }
    }

    nextState = fallbackIndexTokenAndMarket(fallbackIndexTokenAddress);
  }

  if (!isNextMarketTokenValid) {
    nextState = fallbackIndexTokenAndMarket(nextState.tokens.indexTokenAddress);
  }

  const isFallbackPayTokenValid =
    nextState.tokens.fromTokenAddress && allowedPayTokensSet.has(nextState.tokens.fromTokenAddress);
  const isFallbackIndexTokenValid =
    nextState.tokens.indexTokenAddress && allowedIndexTokens.has(nextState.tokens.indexTokenAddress);

  if (!isFallbackPayTokenValid && !isFallbackIndexTokenValid) {
    nextState = fallbackPayToken(prevState.tokens.fromTokenAddress);
    nextState = fallbackIndexTokenAndMarket(prevState.tokens.indexTokenAddress);
  }

  return nextState;
}

function fallbackCollateralTokens(
  newState: StoredTradeOptions,
  marketsInfoData: MarketsInfoData | undefined
): StoredTradeOptions {
  const longOrShort = newState.tradeType === TradeType.Long ? "long" : "short";
  const toTokenAddress =
    newState.tradeType === TradeType.Swap ? newState.tokens.swapToTokenAddress : newState.tokens.indexTokenAddress;
  const marketAddress = toTokenAddress ? newState.markets[toTokenAddress]?.[longOrShort] : undefined;

  if (!marketAddress) {
    return newState;
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

    return produce(newState, (draft) => {
      set(draft, ["collaterals", marketAddress, longOrShort], collateralAddress);
    });
  }

  return newState;
}
