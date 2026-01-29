import uniq from "lodash/uniq";
import uniqBy from "lodash/uniqBy";
import { zeroAddress } from "viem";

import {
  AnyChainId,
  AVALANCHE,
  GMX_ACCOUNT_PSEUDO_CHAIN_ID,
  GmxAccountPseudoChainId,
  SettlementChainId,
} from "config/chains";
import { getMappedTokenId } from "config/multichain";
import {
  selectChainId,
  selectMarketsInfoData,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { ERC20Address, NativeTokenSupportedAddress, TokenData, getGmToken } from "domain/tokens";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { getTokenSymbolByMarket } from "sdk/configs/markets";
import { convertTokenAddress, getWrappedToken } from "sdk/configs/tokens";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import type { DisplayToken } from "components/TokenSelector/types";

import { selectPoolsDetailsMultichainTokensArray, selectPoolsDetailsPaySource } from "./baseSelectors";
import {
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsIsCrossChainMarket,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketAndTradeTokensData,
  selectPoolsDetailsShortTokenAddress,
  selectPoolsDetailsTradeTokensDataWithSourceChainBalances,
} from "./poolsDetailsDerivedSelectors";
import { selectMultichainMarketTokenBalances } from "./selectMultichainMarketTokenBalances";

function createDisplayToken(
  token: TokenData,
  chainIdForToken: AnyChainId | GmxAccountPseudoChainId,
  balance: bigint | undefined = 0n,
  isMarketToken = false
): DisplayToken {
  const balanceUsd = token.prices ? convertToUsd(balance, token.decimals, getMidPrice(token.prices)) ?? 0n : 0n;

  return {
    ...token,
    isMarketToken,
    chainId: chainIdForToken,
    balance,
    balanceUsd,
  };
}

const selectPoolsDetailsWithdrawalTokenOptions = createSelector((q): DisplayToken[] => {
  const chainId = q(selectChainId);
  const srcChainId = q(selectSrcChainId);
  const paySource = q(selectPoolsDetailsPaySource);

  const longTokenAddress = q(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = q(selectPoolsDetailsShortTokenAddress);
  const tradeTokensData = q(selectPoolsDetailsTradeTokensDataWithSourceChainBalances);

  if (!longTokenAddress || !shortTokenAddress) return EMPTY_ARRAY;

  const withdrawalResult: DisplayToken[] = [];

  if (paySource === "settlementChain") {
    const longToken = tradeTokensData?.[longTokenAddress];
    const longNativeToken =
      longTokenAddress === getWrappedToken(chainId).address ? tradeTokensData?.[zeroAddress] : undefined;
    const shortToken = tradeTokensData?.[shortTokenAddress];
    const shortNativeToken =
      shortTokenAddress === getWrappedToken(chainId).address ? tradeTokensData?.[zeroAddress] : undefined;

    const tokens = uniqBy(
      [longToken, longNativeToken, shortToken, shortNativeToken].filter(
        (token): token is TokenData => token !== undefined
      ),
      (token) => token.address
    );

    for (const token of tokens) {
      withdrawalResult.push(createDisplayToken(token, chainId, token.balance ?? 0n));
    }
    return withdrawalResult;
  } else if (paySource === "gmxAccount") {
    const longToken = tradeTokensData?.[longTokenAddress];
    const shortToken = tradeTokensData?.[shortTokenAddress];
    const tokens = uniqBy(
      [longToken, shortToken].filter((token): token is TokenData => token !== undefined),
      (token) => token.address
    );
    for (const token of tokens) {
      withdrawalResult.push(createDisplayToken(token, GMX_ACCOUNT_PSEUDO_CHAIN_ID, token.gmxAccountBalance ?? 0n));
    }
    return withdrawalResult;
  } else if (paySource === "sourceChain") {
    if (!srcChainId) {
      return EMPTY_ARRAY;
    }

    const unwrappedLongToken = getByKey(tradeTokensData, convertTokenAddress(chainId, longTokenAddress, "native"));
    const unwrappedShortToken = getByKey(tradeTokensData, convertTokenAddress(chainId, shortTokenAddress, "native"));
    const tokens = uniqBy(
      [unwrappedLongToken, unwrappedShortToken].filter(
        (token): token is TokenData =>
          token !== undefined && getMappedTokenId(chainId as SettlementChainId, token.address, srcChainId) !== undefined
      ),
      (token) => token.address
    );
    for (const token of tokens) {
      withdrawalResult.push(createDisplayToken(token, srcChainId, token.sourceChainBalance ?? 0n, true));
    }
    return withdrawalResult;
  }

  return EMPTY_ARRAY;
});

const selectPoolsDetailsDepositTokenOptions = createSelector((q): DisplayToken[] => {
  const chainId = q(selectChainId);
  const longTokenAddress = q(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = q(selectPoolsDetailsShortTokenAddress);
  const glvInfo = q(selectPoolsDetailsGlvInfo);
  const { isPair } = q(selectPoolsDetailsFlags);
  const marketsInfoData = q(selectMarketsInfoData);
  const multichainMarketTokensBalances = q(selectMultichainMarketTokenBalances);
  const marketAndTradeTokensData = q(selectPoolsDetailsMarketAndTradeTokensData);
  const multichainTradeTokensArray = q(selectPoolsDetailsMultichainTokensArray);
  const isMarketTransferrableToSourceChain = q(selectPoolsDetailsIsCrossChainMarket);

  if (!longTokenAddress || !shortTokenAddress) return EMPTY_ARRAY;

  const result: DisplayToken[] = [];
  const wrappedToken = getWrappedToken(chainId);

  const tradeTokenAddresses: (ERC20Address | NativeTokenSupportedAddress)[] = uniq([
    longTokenAddress,
    shortTokenAddress,
  ]);

  if (longTokenAddress === wrappedToken.address || shortTokenAddress === wrappedToken.address) {
    tradeTokenAddresses.push(zeroAddress as NativeTokenSupportedAddress);
  }

  const availableSourceChainTokenAddresses = uniq(
    [longTokenAddress, shortTokenAddress].map((tokenAddress) => convertTokenAddress(chainId, tokenAddress, "native"))
  );

  for (const tokenAddress of tradeTokenAddresses) {
    const token = marketAndTradeTokensData?.[tokenAddress];
    if (!token) continue;

    result.push(createDisplayToken(token, chainId, token.walletBalance));

    if (chainId !== AVALANCHE && tokenAddress !== zeroAddress) {
      result.push(createDisplayToken(token, GMX_ACCOUNT_PSEUDO_CHAIN_ID, token.gmxAccountBalance ?? 0n));
    }
  }

  if (isMarketTransferrableToSourceChain && multichainTradeTokensArray) {
    for (const multichainToken of multichainTradeTokensArray) {
      if (
        multichainToken.sourceChainBalance === undefined ||
        multichainToken.sourceChainPrices === undefined ||
        multichainToken.sourceChainBalance === 0n ||
        !availableSourceChainTokenAddresses.includes(multichainToken.address as NativeTokenSupportedAddress)
      ) {
        continue;
      }

      const balanceUsd =
        convertToUsd(
          multichainToken.sourceChainBalance,
          multichainToken.sourceChainDecimals,
          multichainToken.sourceChainPrices.maxPrice
        ) ?? 0n;

      result.push({
        ...multichainToken,
        prices: multichainToken.sourceChainPrices,
        decimals: multichainToken.sourceChainDecimals,
        chainId: multichainToken.sourceChainId,
        balance: multichainToken.sourceChainBalance,
        balanceUsd,
      });
    }
  }

  if (glvInfo && !isPair) {
    for (const market of glvInfo.markets) {
      const marketInfo = marketsInfoData?.[market.address];
      const marketBalances = multichainMarketTokensBalances[market.address];
      if (!marketInfo || marketInfo.isDisabled || !marketBalances || marketBalances.totalBalance === 0n) continue;

      const token = getGmToken(chainId, market.address);
      if (!token) continue;

      const indexTokenSymbol = getTokenSymbolByMarket(chainId, market.address, "index");
      const prices = marketAndTradeTokensData?.[market.address]?.prices ?? { minPrice: 0n, maxPrice: 0n };

      for (const [balanceChainIdString, balanceData] of Object.entries(marketBalances.balances)) {
        if (!balanceData) continue;
        const balanceChainId = Number(balanceChainIdString) as AnyChainId | GmxAccountPseudoChainId;

        if (balanceData.balance === 0n) continue;

        result.push({
          ...token,
          prices,
          isMarketToken: true,
          name: `${indexTokenSymbol}: ${marketInfo.name}`,
          symbol: indexTokenSymbol,
          chainId: balanceChainId,
          balance: balanceData.balance,
          balanceUsd: balanceData.balanceUsd,
        });
      }
    }
  }

  const deduplicated = uniqBy(result, (token) => `${token.address}-${token.chainId}`);

  return deduplicated.sort((a, b) => {
    const aIsPlatform = a.isMarketToken ?? false;
    const bIsPlatform = b.isMarketToken ?? false;

    if (aIsPlatform !== bIsPlatform) {
      return aIsPlatform ? 1 : -1;
    }

    return b.balanceUsd > a.balanceUsd ? 1 : b.balanceUsd < a.balanceUsd ? -1 : 0;
  });
});

export const selectPoolsDetailsTokenOptions = createSelector((q): DisplayToken[] => {
  const { isDeposit, isWithdrawal } = q(selectPoolsDetailsFlags);

  if (isWithdrawal) {
    return q(selectPoolsDetailsWithdrawalTokenOptions);
  }

  if (isDeposit) {
    return q(selectPoolsDetailsDepositTokenOptions);
  }

  return EMPTY_ARRAY;
});
