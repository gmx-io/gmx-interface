import { AnyChainId, GMX_ACCOUNT_PSEUDO_CHAIN_ID } from "config/chains";
import {
  selectChainId,
  selectMultichainMarketTokensBalancesResult,
  selectProgressiveDepositMarketTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import type { MultichainMarketTokenBalances, MultichainMarketTokensBalances } from "domain/multichain/types";
import { EMPTY_OBJECT } from "lib/objects";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

export const selectMultichainMarketTokenBalances = createSelector((q): MultichainMarketTokensBalances => {
  const chainId = q(selectChainId);
  const progressiveMarketTokensData = q(selectProgressiveDepositMarketTokensData);
  const multichainMarketTokensBalancesResult = q(selectMultichainMarketTokensBalancesResult);

  const multichainMarketTokensBalances: MultichainMarketTokensBalances = {};

  for (const tokenAddress in progressiveMarketTokensData) {
    const token = progressiveMarketTokensData[tokenAddress];

    const price = token.prices ? getMidPrice(token.prices) : 0n;

    const walletBalance = token.walletBalance ?? 0n;
    const walletBalanceUsd = convertToUsd(walletBalance, token.decimals, price)!;
    const gmxAccountBalance = token.gmxAccountBalance ?? 0n;
    const gmxAccountBalanceUsd = convertToUsd(gmxAccountBalance, token.decimals, price)!;
    const multichainBalances: MultichainMarketTokenBalances = {
      totalBalance: walletBalance + gmxAccountBalance,
      totalBalanceUsd: walletBalanceUsd + gmxAccountBalanceUsd,
      balances: {
        [chainId]: {
          balance: walletBalance,
          balanceUsd: walletBalanceUsd,
        },
        [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: {
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
      const balanceUsd = convertToUsd(balance, token.decimals, price)!;
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
