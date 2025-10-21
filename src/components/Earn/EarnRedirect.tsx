import { useMemo } from "react";

import { ARBITRUM, AVALANCHE, BOTANIX } from "config/chains";
import { LAST_EARN_TAB_KEY } from "config/localStorage";
import type { TokensData } from "domain/synthetics/tokens";
import { useTokensDataRequest } from "domain/synthetics/tokens";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useWallet from "lib/wallets/useWallet";

import Loader from "components/Loader/Loader";
import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";

import EarnPageLayout, { EarnTab } from "../../pages/Earn/EarnPageLayout";

const EARN_TOKEN_SYMBOLS = new Set(["GMX", "GM", "GLV"]);
const EARN_TABS: ReadonlyArray<EarnTab> = ["discovery", "portfolio", "additional-opportunities", "distributions"];

function isEarnTab(value: string | null): value is EarnTab {
  return typeof value === "string" && (EARN_TABS as ReadonlyArray<string>).includes(value);
}

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
  const { account } = useWallet();

  const [lastEarnTab] = useLocalStorageSerializeKey<EarnTab | undefined>(LAST_EARN_TAB_KEY, undefined);

  const arbitrumTokens = useTokensDataRequest(ARBITRUM);
  const avalancheTokens = useTokensDataRequest(AVALANCHE);
  const botanixTokens = useTokensDataRequest(BOTANIX);

  const stateByChain = [arbitrumTokens, avalancheTokens, botanixTokens];
  const hasError = stateByChain.some((state) => state.error);
  const isBalancesReady =
    Boolean(lastEarnTab) || !account || hasError || stateByChain.every((state) => state.isWalletBalancesLoaded);

  const hasEarnHoldings = useMemo(
    () =>
      hasEarnTokenBalance(arbitrumTokens.tokensData) ||
      hasEarnTokenBalance(avalancheTokens.tokensData) ||
      hasEarnTokenBalance(botanixTokens.tokensData),
    [arbitrumTokens.tokensData, avalancheTokens.tokensData, botanixTokens.tokensData]
  );

  const target =
    lastEarnTab !== undefined && isEarnTab(lastEarnTab)
      ? `/earn/${lastEarnTab}`
      : account && hasEarnHoldings
        ? "/earn/portfolio"
        : "/earn/discovery";

  return (
    <EarnPageLayout>
      <Loader />
      {isBalancesReady && <RedirectWithQuery to={target} />}
    </EarnPageLayout>
  );
}
