import { produce } from "immer";
import get from "lodash/get";
import isEqual from "lodash/isEqual";
import keyBy from "lodash/keyBy";
import mapValues from "lodash/mapValues";
import set from "lodash/set";
import values from "lodash/values";
import { SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { useLatest } from "react-use";

import { AVALANCHE, ContractsChainId, isSolanaNetwork, type NetworkId, SourceChainId } from "config/chains";
import { getNetworkFeatures } from "config/features";
import { getKeepLeverageKey, getLeverageKey, MARGIN_DEPOSIT_SUGGESTION_HIDDEN_KEY } from "config/localStorage";
import { isSettlementChain } from "config/multichain";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { createGetMaxLongShortLiquidityPool } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useEmptyGmxAccounts } from "domain/multichain/useEmptyGmxAccounts";
import { JitLiquidityInfo } from "domain/synthetics/jit/utils";
import { MarketInfo } from "domain/synthetics/markets";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { EMPTY_ARRAY, EMPTY_OBJECT, getByKey } from "lib/objects";
import { useSafeState } from "lib/useSafeState";
import { getContract } from "sdk/configs/contracts";
import { getToken, isSimilarToken } from "sdk/configs/tokens";
import { createTradeFlags } from "sdk/utils/trade";
import { TradeMode, TradeType } from "sdk/utils/trade/types";
import { TwapDuration } from "sdk/utils/twap/types";

import { MarketsData, MarketsInfoData } from "../markets";
import { chooseSuitableMarket } from "../markets/chooseSuitableMarket";
import {
  isLimitOrderType,
  isStopIncreaseOrderType,
  isSwapOrder,
  isTriggerDecreaseOrderType,
  isTwapOrder,
  isTwapSwapOrder,
  OrderInfo,
  OrdersInfoData,
  PositionOrderInfo,
} from "../orders";
import { PositionInfo, PositionsInfoData } from "../positions";
import { TokensData, useTokensAllowanceData } from "../tokens";
import {
  buildResetTradeOptions,
  INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE,
  normalizeTradeOptions,
  readStoredTradeOptions,
  resolveStoredTradeOptionsSync,
  type StoredTradeOptions,
  type TradeboxAdvancedOptions,
  writeStoredTradeOptions,
} from "./tradeboxStorage";
import { useAvailableTokenOptions } from "./useAvailableTokenOptions";
import { useSidecarOrdersState } from "./useSidecarOrdersState";
import { getAvailableTradeModes } from "./utils/availableTradeModes";

export type { StoredTradeOptions } from "./tradeboxStorage";

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

export function useTradeboxState(
  chainId: ContractsChainId,
  enabled: boolean,
  p: {
    networkId: NetworkId;
    marketsData?: MarketsData;
    marketsInfoData?: MarketsInfoData;
    positionsInfoData?: PositionsInfoData;
    ordersInfoData?: OrdersInfoData;
    tokensData?: TokensData;
    srcChainId: SourceChainId | undefined;
    jitLiquidityMap?: Record<string, JitLiquidityInfo>;
  }
) {
  const history = useHistory();
  const latestHistory = useLatest(history);
  const latestEnabled = useLatest(enabled);

  const {
    networkId,
    marketsInfoData,
    marketsData,
    tokensData,
    positionsInfoData,
    ordersInfoData,
    srcChainId,
    jitLiquidityMap,
  } = p;

  const availableTokensOptions = useAvailableTokenOptions(chainId, {
    marketsInfoData,
    tokensData,
    marketsData,
    srcChainId,
    networkId,
  });

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
    const saved = readStoredTradeOptions(networkId);

    if (!saved) {
      writeStoredTradeOptions(networkId, INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE);
      return INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE;
    }

    return saved;
  });

  const setStoredOptionsOnChain = useCallback(
    (args: SetStateAction<StoredTradeOptions>) => {
      setStoredOptionsWithoutFallbacks((oldState) => {
        const newState = normalizeTradeOptions(networkId, typeof args === "function" ? args(oldState) : args);

        if (isEqual(oldState, newState)) {
          return oldState;
        }

        writeStoredTradeOptions(networkId, newState);

        if (latestEnabled.current && newState.tradeType !== oldState.tradeType) {
          latestHistory.current.replace({
            pathname: `/trade/${newState.tradeType.toLowerCase()}`,
            // The search still carries deep link params here, they are applied once markets load.
            search: latestHistory.current.location.search,
          });
        }
        return newState;
      });
    },
    [latestEnabled, latestHistory, networkId]
  );

  const { savedAllowedSlippage, savedTwapNumberOfParts, expressOrdersEnabled } = useSettings();
  const [syncedNetworkId, setSyncedNetworkId] = useState<NetworkId | undefined>(undefined);
  const [allowedSlippage, setAllowedSlippage] = useState<number>(savedAllowedSlippage);

  useEffect(
    function handleNetworkChange() {
      const firstMarket = availableTokensOptions.sortedAllMarkets?.at(0);
      const decision = resolveStoredTradeOptionsSync({
        networkId,
        syncedNetworkId,
        enabled,
        availableIndexTokenAddresses: availableIndexTokensAddresses,
        firstMarket: firstMarket
          ? {
              indexTokenAddress: firstMarket.indexTokenAddress,
              marketTokenAddress: firstMarket.marketTokenAddress,
              shortTokenAddress: firstMarket.shortTokenAddress,
            }
          : undefined,
      });

      if (decision.action === "noop" || decision.action === "wait") {
        return;
      }

      if (decision.action === "restore") {
        setStoredOptionsOnChain(decision.options);
      } else if (decision.action === "reset") {
        // A `/trade/short` link is applied before the chain defaults resolve, so keep its trade type.
        setStoredOptionsOnChain((oldState) => buildResetTradeOptions(oldState.tradeType, decision.market));
      }

      setSyncedNetworkId(networkId);
    },
    [
      availableIndexTokensAddresses,
      availableTokensOptions.sortedAllMarkets,
      enabled,
      networkId,
      setStoredOptionsOnChain,
      syncedNetworkId,
    ]
  );

  const setStoredOptions = useCallback(
    (args: SetStateAction<StoredTradeOptions>) => {
      setStoredOptionsOnChain((oldState) => {
        let newState = normalizeTradeOptions(networkId, typeof args === "function" ? args(oldState) : args);

        if (newState && (newState.tradeType === TradeType.Long || newState.tradeType === TradeType.Short)) {
          newState = fallbackPositionTokens({
            chainId,
            networkId,
            tokensData,
            srcChainId,
            prevState: oldState,
            nextState: newState,
            allowedPayTokens: availableSwapTokenAddresses,
            allowedMarkets: availableTokensOptions.sortedAllMarkets,
          });
          newState = fallbackCollateralTokens(newState, marketsInfoData);
        }

        return newState;
      });
    },
    [
      setStoredOptionsOnChain,
      chainId,
      networkId,
      tokensData,
      srcChainId,
      availableSwapTokenAddresses,
      availableTokensOptions.sortedAllMarkets,
      marketsInfoData,
    ]
  );

  const [fromTokenInputValue, setFromTokenInputValue] = useSafeState("");
  const [toTokenInputValue, setToTokenInputValue] = useSafeState("");
  const [stage, setStage] = useState<TradeStage>("trade");
  const [focusedInput, setFocusedInput] = useState<"from" | "to">();
  const [expressFeeUsdByToken, setExpressFeeUsdByToken] = useState<Record<string, bigint>>(EMPTY_OBJECT);
  const [defaultTriggerAcceptablePriceImpactBps, setDefaultTriggerAcceptablePriceImpactBps] = useState<bigint>();
  const [selectedTriggerAcceptablePriceImpactBps, setSelectedTriggerAcceptablePriceImpactBps] = useState<bigint>();
  const [isAcceptablePriceImpactCustomized, setIsAcceptablePriceImpactCustomized] = useState(false);
  const [defaultAllowedSwapSlippageBps, setDefaultAllowedSwapSlippageBps] = useState<bigint>();
  const [selectedAllowedSwapSlippageBps, setSelectedAllowedSwapSlippageBps] = useState<bigint>();
  const [closeSizeInputValue, setCloseSizeInputValue] = useState("");
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState<string>("");
  const [triggerRatioInputValue, setTriggerRatioInputValue] = useState<string>("");
  const [numberOfParts, setNumberOfParts] = useState<number>(savedTwapNumberOfParts);
  const [duration, setDuration] = useState<TwapDuration>({ hours: 10, minutes: 0 });

  const [advancedOptions, setAdvancedOptions] = useSafeState<TradeboxAdvancedOptions>(
    storedOptions.advanced ?? INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE.advanced
  );

  const latestDefaultTriggerAcceptablePriceImpactBps = useLatest(defaultTriggerAcceptablePriceImpactBps);

  const setUserSelectedAcceptablePriceImpactBps = useCallback(
    (value: bigint) => {
      setSelectedTriggerAcceptablePriceImpactBps(value);
      setIsAcceptablePriceImpactCustomized(value !== latestDefaultTriggerAcceptablePriceImpactBps.current);
    },
    [latestDefaultTriggerAcceptablePriceImpactBps]
  );

  const { swapTokens } = availableTokensOptions;

  const tradeType = storedOptions?.tradeType;
  const tradeMode = storedOptions?.tradeMode;

  const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey(getLeverageKey(networkId), 2);
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey(getKeepLeverageKey(networkId), true);
  const [limitPriceWarningHidden, setLimitPriceWarningHidden] = useLocalStorageSerializeKey(
    "limit-price-warning-hidden",
    false
  );
  const [marginDepositSuggestionHidden, setMarginDepositSuggestionHidden] = useLocalStorageSerializeKey(
    MARGIN_DEPOSIT_SUGGESTION_HIDDEN_KEY,
    false
  );

  const tradeFlags = useMemo(() => createTradeFlags(tradeType, tradeMode), [tradeType, tradeMode]);
  const { isSwap } = tradeFlags;

  const fromTokenAddress = storedOptions?.tokens.fromTokenAddress;
  const isFromTokenGmxAccount = Boolean(storedOptions?.isFromTokenGmxAccount);

  const toTokenAddress = tradeFlags.isSwap
    ? storedOptions?.tokens.swapToTokenAddress
    : storedOptions?.tokens.indexTokenAddress;

  const longOrShort = tradeFlags.isLong ? "long" : "short";
  const marketAddress = toTokenAddress ? storedOptions?.markets[toTokenAddress]?.[longOrShort] : undefined;
  const marketInfo = getByKey(marketsInfoData, marketAddress);

  const collateralAddress = marketAddress && get(storedOptions, ["collaterals", marketAddress, longOrShort]);
  const collateralToken = getByKey(tokensData, collateralAddress);

  // Solana has no ERC-20 allowance; its mints must never reach the EVM multicall.
  const tokensAllowance = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: fromTokenAddress && !isSolanaNetwork(networkId) ? [fromTokenAddress] : EMPTY_ARRAY,
  });
  const availableTradeModes = useMemo(() => {
    if (!tradeType) {
      return [];
    }

    return getAvailableTradeModes({
      chainId,
      networkId,
      tradeType,
      fromTokenAddress,
      toTokenAddress,
    });
  }, [chainId, networkId, tradeType, fromTokenAddress, toTokenAddress]);

  const getMaxLongShortLiquidityPool = useMemo(
    () => createGetMaxLongShortLiquidityPool(availableTokensOptions.sortedAllMarkets || [], jitLiquidityMap),
    [availableTokensOptions.sortedAllMarkets, jitLiquidityMap]
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

        const { maxLongLiquidityPool, maxShortLiquidityPool, indexTokenPools } = getMaxLongShortLiquidityPool(token);

        const patch = chooseSuitableMarket({
          indexTokenAddress: tokenAddress,
          maxLongLiquidityPool,
          maxShortLiquidityPool,
          isSwap: tradeType === TradeType.Swap,
          positionsInfo: positionsInfoData,
          ordersInfo: ordersInfoData,
          preferredTradeType: tradeType,
          currentTradeType: oldState.tradeType,
          userSelectedMarkets: oldState.userSelectedMarkets?.[tokenAddress],
          availableIndexTokenPools: indexTokenPools,
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

  const setIsFromTokenGmxAccount = useCallback(
    (isFromTokenGmxAccount: boolean) => {
      setStoredOptions((oldState) => ({ ...oldState, isFromTokenGmxAccount }));
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
    if (!enabled || storedOptions.tradeType !== TradeType.Swap) {
      return false;
    }

    return true;
  }, [enabled, storedOptions]);

  const setUserSelectedMarketAddress = useCallback(
    (marketAddress?: string) => {
      setStoredOptions((oldState) => {
        const toTokenAddress = oldState.tokens.indexTokenAddress;
        const isLong = oldState.tradeType === TradeType.Long;
        if (!toTokenAddress || !marketAddress) {
          return oldState;
        }

        return produce(oldState, (draft) => {
          draft.markets[toTokenAddress][isLong ? "long" : "short"] = marketAddress;
          set(draft, ["userSelectedMarkets", toTokenAddress, isLong ? "long" : "short"], marketAddress);
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

  const setActiveOrder = useCallback(
    (order?: OrderInfo) => {
      setStoredOptions((oldState) => {
        if (!order) {
          return oldState;
        }

        return produce(oldState, (draft) => {
          draft.tradeMode = TradeMode.Market;
          if (isLimitOrderType(order.orderType)) {
            draft.tradeMode = TradeMode.Limit;
          }
          if (isTriggerDecreaseOrderType(order.orderType)) {
            draft.tradeMode = TradeMode.Trigger;
          }
          if (isStopIncreaseOrderType(order.orderType)) {
            draft.tradeMode = TradeMode.StopMarket;
          }
          if (isTwapOrder(order)) {
            draft.tradeMode = TradeMode.Twap;
          }

          if (isSwapOrder(order) || isTwapSwapOrder(order)) {
            draft.tradeType = TradeType.Swap;
            const marketAddress = order.swapPath[order.swapPath.length - 1];

            draft.tokens.fromTokenAddress = order.initialCollateralToken.address;
            draft.tokens.swapToTokenAddress = order.targetCollateralToken.address;
            draft.markets[marketAddress] = draft.markets[marketAddress] || {};
            set(
              draft,
              ["collaterals", order.marketAddress, order.isLong ? "long" : "short"],
              order.initialCollateralTokenAddress
            );
          } else {
            draft.tradeType = order.isLong ? TradeType.Long : TradeType.Short;
            const newIndexTokenAddress = (order as PositionOrderInfo).indexToken.address;
            draft.tokens.indexTokenAddress = newIndexTokenAddress;
            draft.tokens.fromTokenAddress = order.initialCollateralToken.address;
            draft.markets[newIndexTokenAddress] = draft.markets[newIndexTokenAddress] || {};
            draft.markets[newIndexTokenAddress][order.isLong ? "long" : "short"] = order.marketAddress;
            set(
              draft,
              ["collaterals", order.marketAddress, order.isLong ? "long" : "short"],
              order.initialCollateralToken
            );
          }
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

      // Trigger fallback normalization without forcing a redundant state change.
      setStoredOptions((oldState) => oldState);
    },
    [availableSwapTokenAddresses.length, enabled, marketAddressIndexTokenMap, marketsInfoData, setStoredOptions]
  );

  useEffect(
    function updateTradeMode() {
      if (!enabled) {
        return;
      }

      if (tradeType && tradeMode && !availableTradeModes.flat().some((mode) => mode === tradeMode)) {
        const firstMode = availableTradeModes[0];
        if (firstMode !== undefined) {
          setTradeMode(Array.isArray(firstMode) ? firstMode[0] : firstMode);
        }
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

      const needFromAddressUpdate = !swapTokens.find((t) => t.address === fromTokenAddress);
      const canFromTokenBeGmxAccount = isSettlementChain(chainId);
      const mustFromTokenBeGmxAccount = srcChainId !== undefined;
      const needFromIsGmxAccountUpdate =
        (!canFromTokenBeGmxAccount && isFromTokenGmxAccount) || (mustFromTokenBeGmxAccount && !isFromTokenGmxAccount);

      if (needFromAddressUpdate) {
        setFromTokenAddress(swapTokens[0].address);
      }

      if (needFromIsGmxAccountUpdate) {
        setIsFromTokenGmxAccount(srcChainId !== undefined);
      }

      const needToUpdate = !swapTokens.find((t) => t.address === toTokenAddress);

      if (needToUpdate) {
        setToTokenAddress(swapTokens[0].address);
      }
    },
    [
      chainId,
      enabled,
      fromTokenAddress,
      isFromTokenGmxAccount,
      isSwap,
      setFromTokenAddress,
      setIsFromTokenGmxAccount,
      setToTokenAddress,
      srcChainId,
      swapTokens,
      toTokenAddress,
    ]
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

  const { emptyGmxAccounts } = useEmptyGmxAccounts(getNetworkFeatures(networkId).gmxAccount ? [AVALANCHE] : undefined);
  const isAvalancheSettlement = chainId === AVALANCHE;
  const isAvalancheEmpty = emptyGmxAccounts?.[AVALANCHE] === true;
  const isEmptyAvalancheGmxAccount = isAvalancheSettlement && isAvalancheEmpty;

  useEffect(
    function fallbackIsFromTokenGmxAccount() {
      if (isFromTokenGmxAccount && (!expressOrdersEnabled || isEmptyAvalancheGmxAccount)) {
        setIsFromTokenGmxAccount(false);
      }
    },
    [expressOrdersEnabled, isEmptyAvalancheGmxAccount, isFromTokenGmxAccount, setIsFromTokenGmxAccount]
  );

  return {
    tradeType,
    tradeMode,
    fromTokenAddress,
    toTokenAddress,
    marketAddress,
    marketInfo,
    userSelectedMarkets: storedOptions.userSelectedMarkets,
    collateralAddress,
    collateralToken,
    availableTokensOptions,
    availableTradeModes,
    sidecarOrders,
    isSwitchTokensAllowed,
    tokensAllowance,
    setActivePosition,
    setActiveOrder,
    setFromTokenAddress,
    setToTokenAddress,
    setUserSelectedMarketAddress,
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
    expressFeeUsdByToken,
    setExpressFeeUsdByToken,
    defaultTriggerAcceptablePriceImpactBps,
    setDefaultTriggerAcceptablePriceImpactBps,
    selectedTriggerAcceptablePriceImpactBps,
    setSelectedAcceptablePriceImpactBps: setSelectedTriggerAcceptablePriceImpactBps,
    setUserSelectedAcceptablePriceImpactBps,
    isAcceptablePriceImpactCustomized,
    setIsAcceptablePriceImpactCustomized,
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
    leverageOption,
    setLeverageOption,
    keepLeverage,
    setKeepLeverage,
    limitPriceWarningHidden,
    setLimitPriceWarningHidden,
    marginDepositSuggestionHidden,
    setMarginDepositSuggestionHidden,
    advancedOptions,
    setAdvancedOptions,
    allowedSlippage,
    setAllowedSlippage,
    isFromTokenGmxAccount,
    setIsFromTokenGmxAccount,
    numberOfParts,
    setNumberOfParts,
    duration,
    setDuration,
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
function fallbackPositionTokens({
  chainId,
  networkId,
  tokensData,
  srcChainId,
  prevState,
  nextState,
  allowedPayTokens,
  allowedMarkets,
}: {
  chainId: number;
  networkId: NetworkId;
  tokensData: TokensData | undefined;
  srcChainId: SourceChainId | undefined;
  prevState: StoredTradeOptions;
  nextState: StoredTradeOptions;
  allowedPayTokens: string[];
  allowedMarkets: MarketInfo[];
}) {
  const longOrShort = nextState.tradeType === TradeType.Long ? "long" : "short";
  // The SDK token config has no Solana mints; Solana tokens come from the network's TokensData.
  const findToken = (address: string) =>
    isSolanaNetwork(networkId) ? getByKey(tokensData, address) : getToken(chainId, address);

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
  const canFromTokenBeGmxAccount = isSettlementChain(chainId);
  const mustFromTokenBeGmxAccount = srcChainId !== undefined;
  const isNextPayTokenSourceValid = !(
    (!canFromTokenBeGmxAccount && nextState.isFromTokenGmxAccount) ||
    (mustFromTokenBeGmxAccount && !nextState.isFromTokenGmxAccount)
  );

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

  if (isNextPayTokenValid && isNextIndexTokenValid && isNextMarketTokenValid && isNextPayTokenSourceValid) {
    return nextState;
  }

  if (!isNextPayTokenValid) {
    let fallbackPayTokenAddress = prevState.tokens.fromTokenAddress;

    if (nextPayTokenAddress) {
      const desirablePayToken = findToken(nextPayTokenAddress);

      if (desirablePayToken) {
        const similarPayTokenAddress = Array.from(allowedPayTokensSet).find((m) => {
          const indexToken = findToken(m);

          return indexToken !== undefined && isSimilarToken(indexToken, desirablePayToken);
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
      const desirableIndexToken = findToken(nextIndexTokenAddress);

      if (desirableIndexToken) {
        const similarMarket = allowedMarkets.find((m) => {
          const indexToken = findToken(m.indexTokenAddress);

          return indexToken !== undefined && isSimilarToken(indexToken, desirableIndexToken);
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

  if (!isNextPayTokenSourceValid) {
    nextState = produce(nextState, (draft) => {
      draft.isFromTokenGmxAccount = srcChainId !== undefined;
    });
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
