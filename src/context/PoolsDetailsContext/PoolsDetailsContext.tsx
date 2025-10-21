import mapValues from "lodash/mapValues";
import noop from "lodash/noop";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY } from "config/localStorage";
import {
  selectChainId,
  selectDepositMarketTokensData,
  selectGlvInfo,
  selectMarketsInfoData,
  selectSrcChainId,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { createSelector, useSelector } from "context/SyntheticsStateContext/utils";
import {
  GlvInfoData,
  isMarketTokenAddress,
  MarketsInfoData,
  useMarketTokensDataRequest,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokensData } from "domain/synthetics/tokens";
import { Token, TokenBalanceType } from "domain/tokens";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { parseValue } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import useRouteQuery from "lib/useRouteQuery";
import { useSafeState } from "lib/useSafeState";
import { MARKETS } from "sdk/configs/markets";
import { convertTokenAddress, getToken, GM_STUB_ADDRESS } from "sdk/configs/tokens";
import { getTokenData } from "sdk/utils/tokens";

import { getGmSwapBoxAvailableModes } from "components/GmSwap/GmSwapBox/getGmSwapBoxAvailableModes";
import { FocusedInput, GmPaySource } from "components/GmSwap/GmSwapBox/GmDepositWithdrawalBox/types";
import { Mode, Operation, isMode, isOperation } from "components/GmSwap/GmSwapBox/types";
import { useMultichainTokens, useMultichainTradeTokensRequest } from "components/GmxAccountModal/hooks";

export type PoolsDetailsQueryParams = {
  market: string;
};

function isValidPaySource(paySource: string | undefined): paySource is GmPaySource {
  return (
    (paySource as GmPaySource) === "settlementChain" ||
    (paySource as GmPaySource) === "sourceChain" ||
    (paySource as GmPaySource) === "gmxAccount"
  );
}

function fallbackPaySource({
  operation,
  mode,
  paySource,
  srcChainId,
}: {
  operation: Operation;
  mode: Mode;
  paySource: GmPaySource | undefined;
  srcChainId: number | undefined;
}) {
  if (!isValidPaySource(paySource)) {
    return "gmxAccount";
  } else if (paySource === "sourceChain" && srcChainId === undefined) {
    return "settlementChain";
  } else if (paySource === "settlementChain" && srcChainId !== undefined) {
    return "sourceChain";
  } else if (operation === Operation.Deposit && paySource === "sourceChain" && mode === Mode.Pair) {
    return "gmxAccount";
  }

  return paySource;
}

export type PoolsDetailsState = {
  glvOrMarketAddress: string | undefined;
  selectedMarketForGlv: string | undefined;
  operation: Operation;
  mode: Mode;
  withdrawalMarketTokensData: TokensData | undefined;

  // GM Deposit/Withdrawal Box State
  focusedInput: FocusedInput;
  paySource: GmPaySource;
  firstTokenAddress: string | undefined;
  secondTokenAddress: string | undefined;
  firstTokenInputValue: string;
  secondTokenInputValue: string;
  marketOrGlvTokenInputValue: string;
  isMarketForGlvSelectedManually: boolean;
  multichainTokensResult: ReturnType<typeof useMultichainTokens>;
  // marketTokensBalancesResult: ReturnType<typeof useMultichainMarketTokensBalancesRequest>;

  setOperation: (operation: Operation) => void;
  setMode: (mode: Mode) => void;
  setGlvOrMarketAddress: (glvOrMarketAddress: string) => void;
  setSelectedMarketForGlv: (marketAddress?: string) => void;
  setFocusedInput: (input: FocusedInput) => void;
  setPaySource: (source: GmPaySource) => void;
  setFirstTokenAddress: (address: string | undefined) => void;
  setSecondTokenAddress: (address: string | undefined) => void;
  setFirstTokenInputValue: (value: string) => void;
  setSecondTokenInputValue: (value: string) => void;
  setMarketOrGlvTokenInputValue: (value: string) => void;
  setIsMarketForGlvSelectedManually: (value: boolean) => void;
};

function useReactRouterSearchParam(param: string): [string | undefined, (value: string | undefined) => void] {
  const searchParams = useRouteQuery();
  const value = searchParams.get(param) ?? undefined;
  const setValue = useCallback(
    (value: string | undefined) => {
      searchParams.set(param, value ?? "");
    },
    [searchParams, param]
  );

  return [value, setValue] as const;
}

export function usePoolsDetailsState({
  enabled,
  marketsInfoData,
  account,
  glvData,
  withGlv,
}: {
  enabled: boolean;
  marketsInfoData: MarketsInfoData | undefined;
  account: string | undefined;
  glvData: GlvInfoData | undefined;
  withGlv: boolean;
}) {
  const searchParams = useRouteQuery();
  const { chainId, srcChainId } = useChainId();

  const [glvOrMarketAddress, setGlvOrMarketAddress] = useReactRouterSearchParam("market");

  const [operation, setOperation] = useState<Operation>(Operation.Deposit);
  const [mode, setMode] = useState<Mode>(Mode.Single);
  const [selectedMarketForGlv, setSelectedMarketForGlv] = useState<string | undefined>(undefined);

  const { marketTokensData: withdrawalMarketTokensData } = useMarketTokensDataRequest(chainId, srcChainId, {
    isDeposit: false,
    account,
    glvData,
    withGlv,
    enabled,
    withMultichainBalances: enabled,
  });
  const multichainTokensResult = useMultichainTradeTokensRequest(chainId, account);

  // GM Deposit/Withdrawal Box State
  const isDeposit = operation === Operation.Deposit;
  const [focusedInput, setFocusedInput] = useState<FocusedInput>("market");

  let [rawPaySource, setPaySource] = useLocalStorageSerializeKey<GmPaySource>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, "paySource"],
    "settlementChain"
  );

  const paySource = fallbackPaySource({ operation, mode, paySource: rawPaySource, srcChainId });

  useEffect(
    function fallbackSourceChainPaySource() {
      const newPaySource = fallbackPaySource({ operation, mode, paySource: rawPaySource, srcChainId });
      if (newPaySource !== rawPaySource) {
        setPaySource(newPaySource);
      }
    },
    [mode, operation, rawPaySource, setPaySource, srcChainId]
  );

  const [firstTokenAddress, setFirstTokenAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, glvOrMarketAddress, "first"],
    undefined
  );
  const [secondTokenAddress, setSecondTokenAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, glvOrMarketAddress, "second"],
    undefined
  );
  const [firstTokenInputValue, setFirstTokenInputValue] = useSafeState<string>("");
  const [secondTokenInputValue, setSecondTokenInputValue] = useSafeState<string>("");
  const [marketOrGlvTokenInputValue, setMarketOrGlvTokenInputValue] = useSafeState<string>("");
  const [isMarketForGlvSelectedManually, setIsMarketForGlvSelectedManually] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const operationFromQueryParams = searchParams.get("operation");
    if (operationFromQueryParams && isOperation(operationFromQueryParams)) {
      setOperation(operationFromQueryParams);
    }

    const modeFromQueryParams = searchParams.get("mode");
    if (modeFromQueryParams && isMode(modeFromQueryParams)) {
      setMode(modeFromQueryParams);
    }
  }, [searchParams, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!glvOrMarketAddress) {
      return;
    }

    const newAvailableModes = getGmSwapBoxAvailableModes(operation, getByKey(marketsInfoData, glvOrMarketAddress));

    if (!newAvailableModes.includes(mode)) {
      setMode(newAvailableModes[0]);
    }
  }, [glvOrMarketAddress, marketsInfoData, mode, operation, enabled]);

  const value = useMemo(() => {
    if (!enabled) {
      return undefined;
    }

    return {
      glvOrMarketAddress,
      operation,
      mode,
      withdrawalMarketTokensData,
      selectedMarketForGlv,
      // marketTokensBalancesResult,

      // GM Deposit/Withdrawal Box State
      focusedInput,
      paySource,
      firstTokenAddress,
      secondTokenAddress,
      firstTokenInputValue,
      secondTokenInputValue,
      marketOrGlvTokenInputValue,
      isMarketForGlvSelectedManually,
      multichainTokensResult,

      // Setters
      setOperation,
      setMode,
      setGlvOrMarketAddress,
      setSelectedMarketForGlv,
      setFocusedInput,
      setPaySource,
      setFirstTokenAddress,
      setSecondTokenAddress,
      setFirstTokenInputValue,
      setSecondTokenInputValue,
      setMarketOrGlvTokenInputValue,
      setIsMarketForGlvSelectedManually,
    };
  }, [
    enabled,
    glvOrMarketAddress,
    operation,
    mode,
    withdrawalMarketTokensData,
    selectedMarketForGlv,
    focusedInput,
    paySource,
    firstTokenAddress,
    secondTokenAddress,
    firstTokenInputValue,
    secondTokenInputValue,
    marketOrGlvTokenInputValue,
    isMarketForGlvSelectedManually,
    multichainTokensResult,
    setGlvOrMarketAddress,
    setPaySource,
    setFirstTokenAddress,
    setSecondTokenAddress,
    setFirstTokenInputValue,
    setSecondTokenInputValue,
    setMarketOrGlvTokenInputValue,
  ]);

  // TODO MLTCH move redirect somewhere else
  // if (!value.glvOrMarketAddress) {
  //   return <Redirect to="/pools" />;
  // }

  // return <PoolsDetailsContext.Provider value={value as PoolsDetailsContext}>{children}</PoolsDetailsContext.Provider>;
  return value;
}

export const selectPoolsDetailsGlvOrMarketAddress = (s: SyntheticsState) => s.poolsDetails?.glvOrMarketAddress;
export const selectPoolsDetailsSelectedMarketForGlv = (s: SyntheticsState) => s.poolsDetails?.selectedMarketForGlv;
export const selectPoolsDetailsOperation = (s: SyntheticsState) => s.poolsDetails?.operation ?? Operation.Deposit;
const selectPoolsDetailsMode = (s: SyntheticsState) => s.poolsDetails?.mode ?? Mode.Single;
const selectPoolsDetailsWithdrawalMarketTokensData = (s: SyntheticsState) => s.poolsDetails?.withdrawalMarketTokensData;

// GM Deposit/Withdrawal Box State Selectors
export const selectPoolsDetailsFocusedInput = (s: SyntheticsState) => s.poolsDetails?.focusedInput ?? "market";
export const selectPoolsDetailsPaySource = (s: SyntheticsState) => s.poolsDetails?.paySource ?? "settlementChain";
export const selectPoolsDetailsFirstTokenAddress = (s: SyntheticsState) => s.poolsDetails?.firstTokenAddress;
export const selectPoolsDetailsSecondTokenAddress = (s: SyntheticsState) => s.poolsDetails?.secondTokenAddress;
const selectPoolsDetailsFirstTokenInputValue = (s: SyntheticsState) => s.poolsDetails?.firstTokenInputValue ?? "";
const selectPoolsDetailsSecondTokenInputValue = (s: SyntheticsState) => s.poolsDetails?.secondTokenInputValue ?? "";
const selectPoolsDetailsMarketOrGlvTokenInputValue = (s: SyntheticsState) =>
  s.poolsDetails?.marketOrGlvTokenInputValue ?? "";
export const selectPoolsDetailsIsMarketForGlvSelectedManually = (s: SyntheticsState) =>
  s.poolsDetails?.isMarketForGlvSelectedManually ?? false;
// const selectPoolsDetailsMarketTokenMultichainBalances = (s: SyntheticsState) =>
//   s.poolsDetails?.marketTokensBalancesResult.tokenBalances;

const PLATFORM_TOKEN_DECIMALS = 18;

export const selectPoolsDetailsMarketOrGlvTokenAmount = createSelector((q) => {
  const marketOrGlvTokenInputValue = q(selectPoolsDetailsMarketOrGlvTokenInputValue);

  return parseValue(marketOrGlvTokenInputValue || "0", PLATFORM_TOKEN_DECIMALS)!;
});

export const selectPoolsDetailsGlvTokenAmount = createSelector((q) => {
  const glvInfo = q(selectPoolsDetailsGlvInfo);
  const marketOrGlvTokenAmount = q(selectPoolsDetailsMarketOrGlvTokenAmount);

  if (!glvInfo) {
    return 0n;
  }

  return marketOrGlvTokenAmount;
});

export const selectPoolsDetailsFirstTokenAmount = createSelector((q) => {
  const firstToken = q(selectPoolsDetailsFirstToken);

  if (!firstToken) {
    return 0n;
  }

  const firstTokenInputValue = q(selectPoolsDetailsFirstTokenInputValue);

  return parseValue(firstTokenInputValue || "0", firstToken.decimals)!;
});

export const selectPoolsDetailsSecondTokenAmount = createSelector((q) => {
  const secondToken = q(selectPoolsDetailsSecondToken);

  if (!secondToken) {
    return 0n;
  }

  const secondTokenInputValue = q(selectPoolsDetailsSecondTokenInputValue);

  return parseValue(secondTokenInputValue || "0", secondToken.decimals)!;
});

const FALLBACK_STRING_SETTER = noop as (value: string) => void;
const FALLBACK_BOOLEAN_SETTER = noop as (value: boolean) => void;
// Setters
const selectSetGlvOrMarketAddress = (s: SyntheticsState) => s.poolsDetails?.setGlvOrMarketAddress;
const selectSetSelectedMarketForGlv = (s: SyntheticsState) => s.poolsDetails?.setSelectedMarketForGlv;
const selectSetOperation = (s: SyntheticsState) => s.poolsDetails?.setOperation;
const selectSetMode = (s: SyntheticsState) => s.poolsDetails?.setMode;
const selectSetFocusedInput = (s: SyntheticsState) => s.poolsDetails?.setFocusedInput;
const selectSetPaySource = (s: SyntheticsState) => s.poolsDetails?.setPaySource;
const selectSetFirstTokenAddress = (s: SyntheticsState) => s.poolsDetails?.setFirstTokenAddress;
const selectSetSecondTokenAddress = (s: SyntheticsState) => s.poolsDetails?.setSecondTokenAddress;
export const selectPoolsDetailsSetFirstTokenInputValue = (s: SyntheticsState) =>
  s.poolsDetails?.setFirstTokenInputValue ?? FALLBACK_STRING_SETTER;
export const selectPoolsDetailsSetSecondTokenInputValue = (s: SyntheticsState) =>
  s.poolsDetails?.setSecondTokenInputValue ?? FALLBACK_STRING_SETTER;
export const selectPoolsDetailsSetMarketOrGlvTokenInputValue = (s: SyntheticsState) =>
  s.poolsDetails?.setMarketOrGlvTokenInputValue ?? FALLBACK_STRING_SETTER;
export const selectPoolsDetailsSetIsMarketForGlvSelectedManually = (s: SyntheticsState) =>
  s.poolsDetails?.setIsMarketForGlvSelectedManually ?? FALLBACK_BOOLEAN_SETTER;

export const selectPoolsDetailsGlvInfo = createSelector((q) => {
  const glvOrMarketAddress = q(selectPoolsDetailsGlvOrMarketAddress);
  if (!glvOrMarketAddress) return undefined;

  return q((state) => {
    const glvInfo = selectGlvInfo(state);
    const info = getByKey(glvInfo, glvOrMarketAddress);
    return isGlvInfo(info) ? info : undefined;
  });
});

export const selectPoolsDetailsGlvTokenAddress = createSelector((q) => {
  const glvInfo = q(selectPoolsDetailsGlvInfo);
  return glvInfo?.glvTokenAddress;
});

export const selectPoolsDetailsGlvTokenData = createSelector((q) => {
  const glvInfo = q(selectPoolsDetailsGlvInfo);
  return glvInfo?.glvToken;
});

export const selectPoolsDetailsMarketOrGlvTokenData = createSelector((q) => {
  const glvTokenData = q(selectPoolsDetailsGlvTokenData);
  if (glvTokenData) {
    return glvTokenData;
  }

  return q(selectPoolsDetailsMarketTokenData);
});

export const selectPoolsDetailsMarketTokenAddress = createSelector((q) => {
  const chainId = q(selectChainId);
  const glvOrMarketAddress = q(selectPoolsDetailsGlvOrMarketAddress);
  const selectedMarketForGlv = q(selectPoolsDetailsSelectedMarketForGlv);
  const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);

  const glvInfo = q(selectPoolsDetailsGlvInfo);

  // If it's a GLV but no market is selected, return undefined
  if (glvInfo !== undefined && selectedMarketForGlv === undefined) {
    return undefined;
  }

  const isGlv = glvInfo !== undefined && selectedMarketForGlv !== undefined;

  if (isGlv) {
    if (firstTokenAddress && MARKETS[chainId][firstTokenAddress]) {
      return firstTokenAddress;
    }

    return selectedMarketForGlv;
  }

  return glvOrMarketAddress;
});

export const selectPoolsDetailsMarketInfo = createSelector((q) => {
  const marketTokenAddress = q(selectPoolsDetailsMarketTokenAddress);

  return q((state) => {
    return getByKey(selectMarketsInfoData(state), marketTokenAddress);
  });
});

export const selectPoolsDetailsFlags = createSelector((q) => {
  const operation = q(selectPoolsDetailsOperation);
  const mode = q(selectPoolsDetailsMode);

  return {
    isPair: mode === Mode.Pair,
    isDeposit: operation === Operation.Deposit,
    isWithdrawal: operation === Operation.Withdrawal,
    isSingle: mode === Mode.Single,
  };
});

export const selectPoolsDetailsMarketTokensData = createSelector((q) => {
  const { isDeposit } = q(selectPoolsDetailsFlags);

  if (isDeposit) {
    return q(selectDepositMarketTokensData);
  }

  return q(selectPoolsDetailsWithdrawalMarketTokensData);
});

// TODO MLTCH with balance source chain
// export const

export const selectPoolsDetailsMarketTokenData = createSelector((q) => {
  const marketTokensData = q(selectPoolsDetailsMarketTokensData);

  if (!marketTokensData) {
    return undefined;
  }
  const marketTokenAddress = q(selectPoolsDetailsMarketTokenAddress);

  return getTokenData(marketTokensData, marketTokenAddress);
});

export const selectPoolsDetailsLongTokenAddress = createSelector((q) => {
  const chainId = q(selectChainId);
  const glvOrMarketAddress = q(selectPoolsDetailsGlvOrMarketAddress);

  if (!glvOrMarketAddress) {
    return undefined;
  }

  if (MARKETS[chainId][glvOrMarketAddress]) {
    return MARKETS[chainId][glvOrMarketAddress].longTokenAddress;
  }

  const glvInfo = q(selectPoolsDetailsGlvInfo);

  if (!glvInfo) {
    return undefined;
  }

  return glvInfo.longTokenAddress;
});

export const selectPoolsDetailsShortTokenAddress = createSelector((q) => {
  const chainId = q(selectChainId);
  const glvOrMarketAddress = q(selectPoolsDetailsGlvOrMarketAddress);

  if (!glvOrMarketAddress) {
    return undefined;
  }

  if (MARKETS[chainId][glvOrMarketAddress]) {
    return MARKETS[chainId][glvOrMarketAddress].shortTokenAddress;
  }

  const glvInfo = q(selectPoolsDetailsGlvInfo);

  if (!glvInfo) {
    return undefined;
  }

  return glvInfo.shortTokenAddress;
});

export const selectPoolsDetailsWithdrawalReceiveTokenAddress = createSelector((q) => {
  const { isPair, isWithdrawal } = q(selectPoolsDetailsFlags);

  if (isPair || !isWithdrawal) {
    return undefined;
  }

  const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);

  if (!firstTokenAddress) {
    return undefined;
  }

  const chainId = q(selectChainId);

  return convertTokenAddress(chainId, firstTokenAddress, "wrapped");
});

/**
 * Either undefined meaning no swap needed or a swap from either:
 * - long token to short token
 * - short token to long token
 * Allowing user to sell to single token
 */
export const selectPoolsDetailsWithdrawalFindSwapPath = createSelector((q) => {
  const receiveTokenAddress = q(selectPoolsDetailsWithdrawalReceiveTokenAddress);

  if (!receiveTokenAddress) {
    return undefined;
  }

  const longTokenAddress = q(selectPoolsDetailsLongTokenAddress);

  if (!longTokenAddress) {
    return undefined;
  }

  const shortTokenAddress = q(selectPoolsDetailsShortTokenAddress);

  if (!shortTokenAddress) {
    return undefined;
  }

  // if we want long token in the end, we need to swap short to long
  if (longTokenAddress === receiveTokenAddress) {
    return q(makeSelectFindSwapPath(shortTokenAddress, receiveTokenAddress));
  }

  // if we want short token in the end, we need to swap long to short
  if (shortTokenAddress === receiveTokenAddress) {
    return q(makeSelectFindSwapPath(longTokenAddress, receiveTokenAddress));
  }

  throw new Error("Weird state");
});

export const selectPoolsDetailsIsMarketTokenDeposit = createSelector((q) => {
  const { isDeposit } = q(selectPoolsDetailsFlags);

  if (!isDeposit) {
    return false;
  }

  const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);

  if (!firstTokenAddress) {
    return false;
  }

  const chainId = q(selectChainId);

  return isMarketTokenAddress(chainId, firstTokenAddress);
});

// export const selectPoolsDetailsGlvDepositMarketTokenAddress = createSelector((q) => {
//   const { isDeposit } = q(selectPoolsDetailsFlags);

//   if (!isDeposit) {
//     return undefined;
//   }

//   const glvInfo = q(selectPoolsDetailsGlvInfo);

//   if (!glvInfo) {
//     return undefined;
//   }

//   const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);

//   if (!firstTokenAddress) {
//     return undefined;
//   }

//   if (!glvInfo.markets.some((market) => market.address === firstTokenAddress)) {
//     return undefined;
//   }

//   return firstTokenAddress;
// });

// export const selectPoolsDetailsGlvDepositOr

// export const selectPoolsDetailsGlvDepositMarketTokenAmount = createSelector((q) => {
//   const glvDepositMarketTokenAddress = q(selectPoolsDetailsGlvDepositMarketTokenAddress);

//   if (!glvDepositMarketTokenAddress) {
//     return undefined;
//   }

//   const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);

//   if (glvDepositMarketTokenAddress === firstTokenAddress) {
//     return q(selectPoolsDetailsFirstTokenAmount);
//   }

//   throw new Error("Weird state");
// });

export const selectPoolsDetailsLongTokenAmount = createSelector((q) => {
  const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);
  const secondTokenAddress = q(selectPoolsDetailsSecondTokenAddress);
  const longTokenAddress = q(selectPoolsDetailsLongTokenAddress);
  const firstTokenAmount = q(selectPoolsDetailsFirstTokenAmount);
  const secondTokenAmount = q(selectPoolsDetailsSecondTokenAmount);

  let longTokenAmount = 0n;
  if (firstTokenAddress !== undefined && firstTokenAddress === longTokenAddress) {
    longTokenAmount += firstTokenAmount;
  }
  if (secondTokenAddress !== undefined && secondTokenAddress === longTokenAddress) {
    longTokenAmount += secondTokenAmount;
  }

  return longTokenAmount;
});

export const selectPoolsDetailsShortTokenAmount = createSelector((q) => {
  const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);
  const secondTokenAddress = q(selectPoolsDetailsSecondTokenAddress);
  const shortTokenAddress = q(selectPoolsDetailsShortTokenAddress);
  const firstTokenAmount = q(selectPoolsDetailsFirstTokenAmount);
  const secondTokenAmount = q(selectPoolsDetailsSecondTokenAmount);

  let shortTokenAmount = 0n;
  if (firstTokenAddress !== undefined && firstTokenAddress === shortTokenAddress) {
    shortTokenAmount += firstTokenAmount;
  }
  if (secondTokenAddress !== undefined && secondTokenAddress === shortTokenAddress) {
    shortTokenAmount += secondTokenAmount;
  }

  return shortTokenAmount;
});

export const selectPoolsDetailsFirstToken = createSelector((q): Token | undefined => {
  const chainId = q(selectChainId);
  const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);
  if (!firstTokenAddress) {
    return undefined;
  }

  if (MARKETS[chainId][firstTokenAddress]) {
    return getToken(chainId, GM_STUB_ADDRESS);
  }

  return getToken(chainId, firstTokenAddress);
});

export const selectPoolsDetailsSecondToken = createSelector((q): Token | undefined => {
  const chainId = q(selectChainId);
  const secondTokenAddress = q(selectPoolsDetailsSecondTokenAddress);
  if (!secondTokenAddress) {
    return undefined;
  }

  if (MARKETS[chainId][secondTokenAddress]) {
    return getToken(chainId, GM_STUB_ADDRESS);
  }

  return getToken(chainId, secondTokenAddress);
});

export const selectPoolsDetailsMultichainTokensArray = (s: SyntheticsState) =>
  s.poolsDetails?.multichainTokensResult?.tokenChainDataArray || EMPTY_ARRAY;

export const selectPoolsDetailsTradeTokensDataWithSourceChainBalances = createSelector((q) => {
  const srcChainId = q(selectSrcChainId);
  const paySource = q(selectPoolsDetailsPaySource);
  const rawTradeTokensData = q(selectTokensData);
  const tokenChainDataArray = q(selectPoolsDetailsMultichainTokensArray);

  if (paySource !== "sourceChain") {
    return rawTradeTokensData;
  }

  return mapValues(rawTradeTokensData, (token) => {
    const sourceChainToken = tokenChainDataArray.find(
      (t) => t.address === token.address && t.sourceChainId === srcChainId
    );

    if (!sourceChainToken) {
      return token;
    }

    return {
      ...token,
      balanceType: TokenBalanceType.SourceChain,
      balance: sourceChainToken.sourceChainBalance,
      sourceChainBalance: sourceChainToken.sourceChainBalance,
    };
  });
});

export const selectPoolsDetailsMarketAndTradeTokensData = createSelector((q) => {
  const marketTokensData = q(selectPoolsDetailsMarketTokensData);
  const tradeTokensData = q(selectPoolsDetailsTradeTokensDataWithSourceChainBalances);

  return {
    ...marketTokensData,
    ...tradeTokensData,
  };
});

// GM Deposit/Withdrawal Box State Hooks
export function usePoolsDetailsFocusedInput() {
  const value = useSelector(selectPoolsDetailsFocusedInput);
  const setter = useSelector(selectSetFocusedInput);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsPaySource() {
  const value = useSelector(selectPoolsDetailsPaySource);
  const setter = useSelector(selectSetPaySource);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsFirstTokenAddress() {
  const value = useSelector(selectPoolsDetailsFirstTokenAddress);
  const setter = useSelector(selectSetFirstTokenAddress);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsSecondTokenAddress() {
  const value = useSelector(selectPoolsDetailsSecondTokenAddress);
  const setter = useSelector(selectSetSecondTokenAddress);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsFirstTokenInputValue() {
  const value = useSelector(selectPoolsDetailsFirstTokenInputValue);
  const setter = useSelector(selectPoolsDetailsSetFirstTokenInputValue);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsSecondTokenInputValue() {
  const value = useSelector(selectPoolsDetailsSecondTokenInputValue);
  const setter = useSelector(selectPoolsDetailsSetSecondTokenInputValue);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsMarketOrGlvTokenInputValue() {
  const value = useSelector(selectPoolsDetailsMarketOrGlvTokenInputValue);
  const setter = useSelector(selectPoolsDetailsSetMarketOrGlvTokenInputValue);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

// Additional hooks for operation and mode
export function usePoolsDetailsOperation() {
  const value = useSelector(selectPoolsDetailsOperation);
  const setter = useSelector(selectSetOperation);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsMode() {
  const value = useSelector(selectPoolsDetailsMode);
  const setter = useSelector(selectSetMode);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsGlvOrMarketAddress() {
  const value = useSelector(selectPoolsDetailsGlvOrMarketAddress);
  const setter = useSelector(selectSetGlvOrMarketAddress);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsSelectedMarketForGlv() {
  const value = useSelector(selectPoolsDetailsSelectedMarketForGlv);
  const setter = useSelector(selectSetSelectedMarketForGlv);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}

export function usePoolsDetailsIsMarketForGlvSelectedManually() {
  const value = useSelector(selectPoolsDetailsIsMarketForGlvSelectedManually);
  const setter = useSelector(selectPoolsDetailsSetIsMarketForGlvSelectedManually);
  return [value, (setter || noop) as Exclude<typeof setter, undefined>] as const;
}
