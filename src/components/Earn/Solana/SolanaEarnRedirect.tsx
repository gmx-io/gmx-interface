import EarnPageLayout from "pages/Earn/EarnPageLayout";

import Loader from "components/Loader/Loader";
import { RedirectWithQuery } from "components/RedirectWithQuery/RedirectWithQuery";

import { useSolanaEarnData } from "./useSolanaEarnData";

// Same rule as the EVM Earn entry: Portfolio for a connected wallet with Earn holdings, Discover otherwise.
// On Solana, GT takes the place of GMX staking, so GT counts as a holding next to GM/GLV.
export function SolanaEarnRedirect() {
  const { account, isWalletInitializing, isLoading, gt, assets } = useSolanaEarnData();

  const isReady = !isWalletInitializing && (!account || !isLoading);
  const hasGt = Boolean(gt && gt.balance + gt.unclaimedFromStaking > 0n);
  const hasAnyEarnHoldings = assets.length > 0 || hasGt;
  const target = account && hasAnyEarnHoldings ? "/earn/portfolio" : "/earn/discover";

  return (
    <EarnPageLayout>
      <Loader />
      {isReady && <RedirectWithQuery to={target} />}
    </EarnPageLayout>
  );
}
