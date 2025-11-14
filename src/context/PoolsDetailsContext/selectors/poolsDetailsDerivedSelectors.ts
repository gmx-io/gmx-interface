import mapValues from "lodash/mapValues";

import {
  selectChainId,
  selectDepositMarketTokensData,
  selectGlvAndMarketsInfoData,
  selectGlvInfo,
  selectMarketsInfoData,
  selectSrcChainId,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { isMarketInfo } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { ERC20Address, getGmToken, getTokenData, Token, TokenBalanceType } from "domain/tokens";
import { parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { MARKETS } from "sdk/configs/markets";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";
import { SwapPricingType } from "sdk/types/orders";
import { isMarketTokenAddress } from "sdk/utils/markets";

import { Mode, Operation } from "components/GmSwap/GmSwapBox/types";

import {
  selectPoolsDetailsPaySource,
  selectPoolsDetailsMultichainTokensArray,
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsMode,
  selectPoolsDetailsOperation,
  selectPoolsDetailsSelectedMarketAddressForGlv,
  selectPoolsDetailsWithdrawalMarketTokensData,
  PLATFORM_TOKEN_DECIMALS,
  selectPoolsDetailsFirstTokenInputValue,
  selectPoolsDetailsMarketOrGlvTokenInputValue,
  selectPoolsDetailsSecondTokenInputValue,
} from "./baseSelectors";

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

export const selectPoolsDetailsGlvInfo = createSelector((q) => {
  const glvOrMarketAddress = q(selectPoolsDetailsGlvOrMarketAddress);
  if (!glvOrMarketAddress) return undefined;

  return q((state) => {
    const glvInfo = selectGlvInfo(state);
    const info = getByKey(glvInfo, glvOrMarketAddress);
    return isGlvInfo(info) ? info : undefined;
  });
});

export const selectPoolsDetailsGlvOrMarketInfo = createSelector((q) => {
  const glvOrMarketAddress = q(selectPoolsDetailsGlvOrMarketAddress);
  if (!glvOrMarketAddress) return undefined;

  return q((state) => {
    const glvAndMarketsInfoData = selectGlvAndMarketsInfoData(state);
    return getByKey(glvAndMarketsInfoData, glvOrMarketAddress);
  });
});

export const selectPoolsDetailsSelectedMarketInfoForGlv = createSelector((q) => {
  const selectedMarketAddressForGlv = q(selectPoolsDetailsSelectedMarketAddressForGlv);
  const glvAndMarketsInfoData = q(selectGlvAndMarketsInfoData);

  if (!selectedMarketAddressForGlv) {
    return undefined;
  }

  const glvOrMarketInfo = getByKey(glvAndMarketsInfoData, selectedMarketAddressForGlv);
  return glvOrMarketInfo && isMarketInfo(glvOrMarketInfo) ? glvOrMarketInfo : undefined;
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

export const selectPoolsDetailsGlvTokenAddress = createSelector((q) => {
  const glvInfo = q(selectPoolsDetailsGlvInfo);
  return glvInfo?.glvTokenAddress;
});

export const selectPoolsDetailsMarketTokenAddress = createSelector((q) => {
  const chainId = q(selectChainId);
  const glvOrMarketAddress = q(selectPoolsDetailsGlvOrMarketAddress);
  const selectedMarketForGlv = q(selectPoolsDetailsSelectedMarketAddressForGlv);
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

export const selectPoolsDetailsMarketTokensData = createSelector((q) => {
  const { isDeposit } = q(selectPoolsDetailsFlags);

  if (isDeposit) {
    return q(selectDepositMarketTokensData);
  }

  return q(selectPoolsDetailsWithdrawalMarketTokensData);
});

export const selectPoolsDetailsMarketInfo = createSelector((q) => {
  const marketTokenAddress = q(selectPoolsDetailsMarketTokenAddress);

  return q((state) => {
    return getByKey(selectMarketsInfoData(state), marketTokenAddress);
  });
});

export const selectPoolsDetailsMarketTokenData = createSelector((q) => {
  const marketTokensData = q(selectPoolsDetailsMarketTokensData);

  if (!marketTokensData) {
    return undefined;
  }
  const marketTokenAddress = q(selectPoolsDetailsMarketTokenAddress);

  return getTokenData(marketTokensData, marketTokenAddress);
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

export const selectPoolsDetailsFirstTokenData = createSelector((q) => {
  const marketAndTradeTokensData = q(selectPoolsDetailsMarketAndTradeTokensData);
  const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);

  if (!marketAndTradeTokensData || !firstTokenAddress) {
    return undefined;
  }

  return getTokenData(marketAndTradeTokensData, firstTokenAddress);
});

export const selectPoolsDetailsSecondTokenData = createSelector((q) => {
  const marketAndTradeTokensData = q(selectPoolsDetailsMarketAndTradeTokensData);
  const secondTokenAddress = q(selectPoolsDetailsSecondTokenAddress);

  if (!marketAndTradeTokensData || !secondTokenAddress) {
    return undefined;
  }

  return getTokenData(marketAndTradeTokensData, secondTokenAddress);
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

export const selectPoolsDetailsIsFirstBuy = createSelector((q) => {
  const marketTokensData = q(selectPoolsDetailsMarketTokensData);

  if (!marketTokensData) {
    return false;
  }

  return Object.values(marketTokensData).every((marketToken) => marketToken.balance === 0n);
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
    return q(makeSelectFindSwapPath(shortTokenAddress, receiveTokenAddress, SwapPricingType.Withdrawal));
  }

  // if we want short token in the end, we need to swap long to short
  if (shortTokenAddress === receiveTokenAddress) {
    return q(makeSelectFindSwapPath(longTokenAddress, receiveTokenAddress, SwapPricingType.Withdrawal));
  }

  throw new Error("Weird state");
});
