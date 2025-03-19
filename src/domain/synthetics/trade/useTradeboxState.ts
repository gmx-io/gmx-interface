import { produce } from "immer";
import get from "lodash/get";
import isEqual from "lodash/isEqual";
import keyBy from "lodash/keyBy";
import mapValues from "lodash/mapValues";
import set from "lodash/set";
import values from "lodash/values";
import { SetStateAction, useCallback, useEffect, useMemo, useState } from "react";

import { getKeepLeverageKey, getLeverageKey, getSyntheticsTradeOptionsKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { createGetMaxLongShortLiquidityPool } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { MarketInfo } from "domain/synthetics/markets";
import { getIsUnwrap, getIsWrap } from "domain/tokens";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { EMPTY_OBJECT, getByKey } from "lib/objects";
import { useSafeState } from "lib/useSafeState";
import { getToken, isSimilarToken } from "sdk/configs/tokens";
import { TradeMode, TradeType } from "sdk/types/trade";
import { createTradeFlags } from "sdk/utils/trade";


import { MarketsData, MarketsInfoData } from "../markets";
import { chooseSuitableMarket } from "../markets/chooseSuitableMarket";
import { OrdersInfoData } from "../orders";
import { PositionInfo, PositionsInfoData } from "../positions";
import { TokensData } from "../tokens";
import { useAvailableTokenOptions } from "./useAvailableTokenOptions";
import { useSidecarOrdersState } from "./useSidecarOrdersState";

export type TradeStage = "trade" | "processing";

type TradeOptions = {
  tradeType?: TradeType;
  tradeMode?: TradeMode;
  fromTokenAddress?: string;
  toTokenAddress?: string;
  marketAddress?: string;
  collateralAddress?: string;
};

export type TradeboxState = ReturnType<typeof useTradeboxState>;

export interface TradeboxAdvancedOptions {
  advancedDisplay: boolean;
  limitOrTPSL: boolean;
}

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
  advanced?: TradeboxAdvancedOptions;
};

const INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE: StoredTradeOptions = {
  tradeType: TradeType.Long,
  tradeMode: TradeMode.Market,
  tokens: {},
  markets: {},
  collaterals: {},
  advanced: {
    advancedDisplay: false,
    limitOrTPSL: false,
  },
};

export function useTradeboxState(
  chainId: number,
  enabled: boolean,
  p: {
    marketsData?: MarketsData;
    marketsInfoData?: MarketsInfoData;
    positionsInfoData?: PositionsInfoData;
    ordersInfoData?: OrdersInfoData;
    tokensData?: TokensData;
  }
) {
  const { marketsInfoData, marketsData, tokensData, positionsInfoData, ordersInfoData } = p;

  const availableTokensOptions = useAvailableTokenOptions(chainId, { marketsInfoData, tokensData, marketsData });

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

  const { savedAllowedSlippage } = useSettings();
  const [syncedChainId, setSyncedChainId] = useState<number | undefined>(undefined);
  const [allowedSlippage, setAllowedSlippage] = useState<number>(savedAllowedSlippage);

  useEffect(
    function handleChainChange() {
      if (syncedChainId === chainId) {
        return;
      }

      if (!enabled) return;

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
      enabled,
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
  const [defaultTriggerAcceptablePriceImpactBps, setDefaultTriggerAcceptablePriceImpactBps] = useState<bigint>();
  const [selectedTriggerAcceptablePriceImpactBps, setSelectedTriggerAcceptablePriceImpactBps] = useState<bigint>();
  const [defaultAllowedSwapSlippageBps, setDefaultAllowedSwapSlippageBps] = useState<bigint>();
  const [selectedAllowedSwapSlippageBps, setSelectedAllowedSwapSlippageBps] = useState<bigint>();
  const [closeSizeInputValue, setCloseSizeInputValue] = useState("");
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState<string>("");
  const [triggerRatioInputValue, setTriggerRatioInputValue] = useState<string>("");

  const [advancedOptions, setAdvancedOptions] = useSafeState<TradeboxAdvancedOptions>(
    storedOptions.advanced ?? INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE.advanced
  );

  const { swapTokens } = availableTokensOptions;

  const tradeType = storedOptions?.tradeType;
  const tradeMode = storedOptions?.tradeMode;

  const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey(getLeverageKey(chainId), 2);
  // const [isLeverageEnabled, setIsLeverageEnabled] = useLocalStorageSerializeKey(getLeverageEnabledKey(chainId), true);
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey(getKeepLeverageKey(chainId), true);
  const [leverageInputValue, setLeverageInputValue] = useState<string>(() => leverageOption?.toString() ?? "");

  const availableTradeModes = useMemo(() => {
    if (!tradeType) {
      return [];
    }

    return {
      [TradeType.Long]: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger, TradeMode.StopMarket],
      [TradeType.Short]: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger, TradeMode.StopMarket],
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
          ordersInfo: ordersInfoData,
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
    [getMaxLongShortLiquidityPool, positionsInfoData, setStoredOptions, tokensData, ordersInfoData]
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
    if (!enabled) {
      return false;
    }

    if (storedOptions.tradeType === TradeType.Swap) {
      return true;
    }

    const desirablePayAddress = storedOptions.tokens.indexTokenAddress;
    const desirableToAddress = storedOptions.tokens.fromTokenAddress;

    let swappedOptionsWithFallback;

    try {
      swappedOptionsWithFallback = fallbackPositionTokens(
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
    } catch (e) {
      /**
       * This fallback made in attempt to prevent crushes for those users who already have invalid stored options.
       * @see https://app.asana.com/0/1207525044994982/1207972476109456
       */
      setStoredOptionsOnChain(INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE);
      return false;
    }

    const nextPayAddress = swappedOptionsWithFallback.tokens.fromTokenAddress;
    const nextToAddress = swappedOptionsWithFallback.tokens.indexTokenAddress;

    if (!desirablePayAddress || !nextPayAddress || !desirableToAddress || !nextToAddress) {
      return false;
    }

    return (
      isSimilarToken(getToken(chainId, desirablePayAddress), getToken(chainId, nextPayAddress)) ||
      isSimilarToken(getToken(chainId, desirableToAddress), getToken(chainId, nextToAddress))
    );
  }, [
    enabled,
    storedOptions,
    chainId,
    availableSwapTokenAddresses,
    availableTokensOptions.sortedAllMarkets,
    setStoredOptionsOnChain,
  ]);

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

  const handleLeverageInputChange = useCallback(
    (value: string) => {
      const sanitizedValue = value.replace(",", ".");

      const endsInDot = sanitizedValue.endsWith(".");

      const numberValue = parseFloat(sanitizedValue);

      if (isNaN(numberValue)) {
        setLeverageInputValue(value);
        return;
      }

      const truncatedValue = Math.trunc(numberValue * 10) / 10;

      let stringValue = truncatedValue.toString();

      if (endsInDot) {
        stringValue += ".";
      }

      setLeverageInputValue(stringValue);
      setLeverageOption(truncatedValue);
    },
    [setLeverageOption]
  );

  const handleLeverageSliderChange = useCallback(
    (value: number) => {
      setLeverageOption(value);
      setLeverageInputValue(value.toString());
    },
    [setLeverageOption]
  );

  const sidecarOrders = useSidecarOrdersState();

  useEffect(
    function fallbackStoredOptions() {
      if (!enabled) {
        return;
      }

      if (availableSwapTokenAddresses.length === 0 && values(marketAddressIndexTokenMap).length === 0) {
        return;
      }

      if (values(marketsInfoData).length === 0) {
        return;
      }

      setStoredOptions((oldState) => ({ ...oldState }));
    },
    [availableSwapTokenAddresses.length, enabled, marketAddressIndexTokenMap, marketsInfoData, setStoredOptions]
  );

  useEffect(
    function updateTradeMode() {
      if (!enabled) {
        return;
      }

      if (tradeType && tradeMode && !availableTradeModes.includes(tradeMode)) {
        setTradeMode(availableTradeModes[0]);
      }
    },
    [tradeType, tradeMode, availableTradeModes, setTradeMode, enabled]
  );

  useEffect(
    function updateSwapTokens() {
      if (!enabled) {
        return;
      }

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
    [enabled, fromTokenAddress, isSwap, setFromTokenAddress, setToTokenAddress, swapTokens, toTokenAddress]
  );

  useEffect(() => {
    /**
     * This check required to avoid redundant calls caused by chainId override in context/SynteticsStateContextProvider.txs:104
     * Overriding chainId causes setStoredOptionsOnChain change and this effect is triggered overriding stored options with wrong chainId
     */
    if (isEqual(storedOptions.advanced, advancedOptions)) {
      return;
    }

    setStoredOptionsOnChain((oldState) => {
      return {
        ...oldState,
        advanced: advancedOptions,
      };
    });
  }, [advancedOptions, setStoredOptionsOnChain, storedOptions.advanced]);

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
    availableTradeModes,
    sidecarOrders,
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
    defaultTriggerAcceptablePriceImpactBps,
    setDefaultTriggerAcceptablePriceImpactBps,
    selectedTriggerAcceptablePriceImpactBps,
    setSelectedAcceptablePriceImpactBps: setSelectedTriggerAcceptablePriceImpactBps,
    defaultAllowedSwapSlippageBps,
    setDefaultAllowedSwapSlippageBps,
    selectedAllowedSwapSlippageBps,
    setSelectedAllowedSwapSlippageBps,
    closeSizeInputValue,
    setCloseSizeInputValue,
    triggerPriceInputValue,
    setTriggerPriceInputValue,
    triggerRatioInputValue,
    setTriggerRatioInputValue,
    leverageInputValue,
    setLeverageInputValue: handleLeverageInputChange,
    leverageOption,
    setLeverageOption: handleLeverageSliderChange,
    // isLeverageEnabled,
    // setIsLeverageEnabled,
    keepLeverage,
    setKeepLeverage,
    advancedOptions,
    setAdvancedOptions,
    allowedSlippage,
    setAllowedSlippage,
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
