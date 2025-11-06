import mapValues from "lodash/mapValues";
import noop from "lodash/noop";

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
import { createSelector } from "context/SyntheticsStateContext/utils";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { ERC20Address, getGmToken, getTokenData, Token, TokenBalanceType } from "domain/tokens";
import { parseValue } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { MARKETS } from "sdk/configs/markets";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";
import { isMarketTokenAddress } from "sdk/utils/markets";

import { Mode, Operation } from "components/GmSwap/GmSwapBox/types";

const FALLBACK_STRING_SETTER = noop as (value: string) => void;
const FALLBACK_BOOLEAN_SETTER = noop as (value: boolean) => void;

export const selectPoolsDetailsGlvOrMarketAddress = (s: SyntheticsState) => s.poolsDetails?.glvOrMarketAddress;
export const selectPoolsDetailsSelectedMarketForGlv = (s: SyntheticsState) => s.poolsDetails?.selectedMarketForGlv;
export const selectPoolsDetailsOperation = (s: SyntheticsState) => s.poolsDetails?.operation ?? Operation.Deposit;
export const selectPoolsDetailsMode = (s: SyntheticsState) => s.poolsDetails?.mode ?? Mode.Single;
const selectPoolsDetailsWithdrawalMarketTokensData = (s: SyntheticsState) => s.poolsDetails?.withdrawalMarketTokensData;
export const selectPoolsDetailsFocusedInput = (s: SyntheticsState) => s.poolsDetails?.focusedInput ?? "market";
export const selectPoolsDetailsPaySource = (s: SyntheticsState) => s.poolsDetails?.paySource ?? "settlementChain";
export const selectPoolsDetailsFirstTokenAddress = (s: SyntheticsState) => s.poolsDetails?.firstTokenAddress;
export const selectPoolsDetailsSecondTokenAddress = (s: SyntheticsState) => s.poolsDetails?.secondTokenAddress;
export const selectPoolsDetailsFirstTokenInputValue = (s: SyntheticsState) =>
  s.poolsDetails?.firstTokenInputValue ?? "";
export const selectPoolsDetailsSecondTokenInputValue = (s: SyntheticsState) =>
  s.poolsDetails?.secondTokenInputValue ?? "";
export const selectPoolsDetailsMarketOrGlvTokenInputValue = (s: SyntheticsState) =>
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

// Setters
export const selectSetGlvOrMarketAddress = (s: SyntheticsState) => s.poolsDetails?.setGlvOrMarketAddress;
export const selectSetSelectedMarketForGlv = (s: SyntheticsState) => s.poolsDetails?.setSelectedMarketForGlv;
export const selectSetOperation = (s: SyntheticsState) => s.poolsDetails?.setOperation;
export const selectSetMode = (s: SyntheticsState) => s.poolsDetails?.setMode;
export const selectSetFocusedInput = (s: SyntheticsState) => s.poolsDetails?.setFocusedInput;
export const selectSetPaySource = (s: SyntheticsState) => s.poolsDetails?.setPaySource;
export const selectSetFirstTokenAddress = (s: SyntheticsState) => s.poolsDetails?.setFirstTokenAddress;
export const selectSetSecondTokenAddress = (s: SyntheticsState) => s.poolsDetails?.setSecondTokenAddress;
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

export const selectPoolsDetailsLongTokenAddress = createSelector((q): ERC20Address | undefined => {
  const chainId = q(selectChainId);
  const glvOrMarketAddress = q(selectPoolsDetailsGlvOrMarketAddress);

  if (!glvOrMarketAddress) {
    return undefined;
  }

  if (isMarketTokenAddress(chainId, glvOrMarketAddress)) {
    return MARKETS[chainId][glvOrMarketAddress].longTokenAddress as ERC20Address;
  }

  const glvInfo = q(selectPoolsDetailsGlvInfo);

  if (!glvInfo) {
    return undefined;
  }

  return glvInfo.longTokenAddress as ERC20Address;
});

export const selectPoolsDetailsShortTokenAddress = createSelector((q) => {
  const chainId = q(selectChainId);
  const glvOrMarketAddress = q(selectPoolsDetailsGlvOrMarketAddress);

  if (!glvOrMarketAddress) {
    return undefined;
  }

  if (isMarketTokenAddress(chainId, glvOrMarketAddress)) {
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

export const selectPoolsDetailsLongTokenAmount = createSelector((q) => {
  const chainId = q(selectChainId);
  const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);
  const secondTokenAddress = q(selectPoolsDetailsSecondTokenAddress);
  const longTokenAddress = q(selectPoolsDetailsLongTokenAddress);
  const firstTokenAmount = q(selectPoolsDetailsFirstTokenAmount);
  const secondTokenAmount = q(selectPoolsDetailsSecondTokenAmount);

  let longTokenAmount = 0n;
  if (
    firstTokenAddress !== undefined &&
    convertTokenAddress(chainId, firstTokenAddress, "wrapped") === longTokenAddress
  ) {
    longTokenAmount += firstTokenAmount;
  }
  if (
    secondTokenAddress !== undefined &&
    convertTokenAddress(chainId, secondTokenAddress, "wrapped") === longTokenAddress
  ) {
    longTokenAmount += secondTokenAmount;
  }

  return longTokenAmount;
});

export const selectPoolsDetailsShortTokenAmount = createSelector((q) => {
  const chainId = q(selectChainId);
  const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);
  const secondTokenAddress = q(selectPoolsDetailsSecondTokenAddress);
  const shortTokenAddress = q(selectPoolsDetailsShortTokenAddress);
  const firstTokenAmount = q(selectPoolsDetailsFirstTokenAmount);
  const secondTokenAmount = q(selectPoolsDetailsSecondTokenAmount);

  let shortTokenAmount = 0n;
  if (
    firstTokenAddress !== undefined &&
    convertTokenAddress(chainId, firstTokenAddress, "wrapped") === shortTokenAddress
  ) {
    shortTokenAmount += firstTokenAmount;
  }
  if (
    secondTokenAddress !== undefined &&
    convertTokenAddress(chainId, secondTokenAddress, "wrapped") === shortTokenAddress
  ) {
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

  if (isMarketTokenAddress(chainId, firstTokenAddress)) {
    return getGmToken(chainId, firstTokenAddress);
  }

  return getToken(chainId, firstTokenAddress);
});

export const selectPoolsDetailsSecondToken = createSelector((q): Token | undefined => {
  const chainId = q(selectChainId);
  const secondTokenAddress = q(selectPoolsDetailsSecondTokenAddress);
  if (!secondTokenAddress) {
    return undefined;
  }

  if (isMarketTokenAddress(chainId, secondTokenAddress)) {
    return getGmToken(chainId, secondTokenAddress);
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
