import { useMemo } from "react";
import { useAccount } from "wagmi";

import { ARBITRUM, AVALANCHE, BOTANIX } from "config/chains";
import type { TokensData } from "domain/synthetics/tokens";
import { useTokensDataRequest } from "domain/synthetics/tokens";

import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";

import EarnPageLayout from "../../pages/Earn/EarnPageLayout";

const EARN_TOKEN_SYMBOLS = new Set(["GMX", "GM", "GLV"]);

function hasEarnTokenBalance(tokensData: TokensData | undefined) {
  if (!tokensData) {
    return false;
  }

  return Object.values(tokensData).some((token) => {
    if (!EARN_TOKEN_SYMBOLS.has(token.symbol)) {
      return false;
    }

    const balance = token.balance ?? token.walletBalance;
    return balance !== undefined && balance > 0n;
  });
}

export function EarnRedirect() {
  const { address: account } = useAccount();

  const arbitrumTokens = useTokensDataRequest(ARBITRUM);
  const avalancheTokens = useTokensDataRequest(AVALANCHE);
  const botanixTokens = useTokensDataRequest(BOTANIX);

  const stateByChain = [arbitrumTokens, avalancheTokens, botanixTokens];
  const hasError = stateByChain.some((state) => state.error);
  const isBalancesReady = !account || hasError || stateByChain.every((state) => state.isWalletBalancesLoaded);

  const hasEarnHoldings = useMemo(
    () =>
      hasEarnTokenBalance(arbitrumTokens.tokensData) ||
      hasEarnTokenBalance(avalancheTokens.tokensData) ||
      hasEarnTokenBalance(botanixTokens.tokensData),
    [arbitrumTokens.tokensData, avalancheTokens.tokensData, botanixTokens.tokensData]
  );

  if (!isBalancesReady) {
    return <EarnPageLayout />;
  }

  const target = account && hasEarnHoldings ? "/earn/portfolio" : "/earn/discovery";

  return (
    <EarnPageLayout>
      <RedirectWithQuery to={target} />
    </EarnPageLayout>
  );
}
