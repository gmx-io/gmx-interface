import { AnyChainId } from "config/chains";
import {
  selectChainId,
  selectMultichainMarketTokensBalancesResult,
  selectProgressiveDepositMarketTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { MultichainMarketTokenBalances, MultichainMarketTokensBalances } from "domain/multichain/types";
import { EMPTY_OBJECT } from "lib/objects";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

export const selectMultichainMarketTokenBalances = createSelector((q): MultichainMarketTokensBalances => {
  const chainId = q(selectChainId);
  const progressiveMarketTokensData = q(selectProgressiveDepositMarketTokensData);
  const multichainMarketTokensBalancesResult = q(selectMultichainMarketTokensBalancesResult);

  const multichainMarketTokensBalances: MultichainMarketTokensBalances = {};

  for (const tokenAddress in progressiveMarketTokensData) {
    const token = progressiveMarketTokensData[tokenAddress];

    const walletBalance = token.walletBalance ?? 0n;
    const walletBalanceUsd = token.prices
      ? convertToUsd(walletBalance, token.decimals, getMidPrice(token.prices))!
      : 0n;
    const gmxAccountBalance = token.gmxAccountBalance ?? 0n;
    const gmxAccountBalanceUsd = token.prices
      ? convertToUsd(gmxAccountBalance, token.decimals, getMidPrice(token.prices))!
      : 0n;
    const multichainBalances: MultichainMarketTokenBalances = {
      totalBalance: walletBalance + gmxAccountBalance,
      totalBalanceUsd: walletBalanceUsd + gmxAccountBalanceUsd,
      balances: {
        [chainId]: {
          balance: walletBalance,
          balanceUsd: walletBalanceUsd,
        },
        [0]: {
          balance: gmxAccountBalance,
          balanceUsd: gmxAccountBalanceUsd,
        },
      },
    };

    for (const sourceChainId in multichainMarketTokensBalancesResult?.tokenBalances ?? EMPTY_OBJECT) {
      const balance =
        multichainMarketTokensBalancesResult?.tokenBalances?.[sourceChainId as unknown as AnyChainId]?.[tokenAddress];
      if (balance === undefined) {
        continue;
      }
      const balanceUsd = token.prices ? convertToUsd(balance, token.decimals, getMidPrice(token.prices))! : 0n;
      multichainBalances.balances[sourceChainId as unknown as AnyChainId] = {
        balance: balance,
        balanceUsd: balanceUsd,
      };
      multichainBalances.totalBalance = multichainBalances.totalBalance + balance;
      multichainBalances.totalBalanceUsd = multichainBalances.totalBalanceUsd + balanceUsd;
    }
    multichainMarketTokensBalances[tokenAddress] = multichainBalances;
  }

  return multichainMarketTokensBalances;
});
