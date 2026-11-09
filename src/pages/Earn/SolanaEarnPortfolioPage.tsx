import { useChainId } from "lib/chains";
import EarnPageLayout from "pages/Earn/EarnPageLayout";

import { SolanaAssetsList } from "components/Earn/Solana/SolanaAssetsList";
import { SolanaEarningsOverview } from "components/Earn/Solana/SolanaEarningsOverview";
import { useSolanaEarnData } from "components/Earn/Solana/useSolanaEarnData";
import ErrorBoundary from "components/Errors/ErrorBoundary";
import Loader from "components/Loader/Loader";

export default function SolanaEarnPortfolioPage() {
  const { chainId } = useChainId();
  const data = useSolanaEarnData();
  const isConnected = Boolean(data.account) && !data.isWalletInitializing;
  const areAssetsLoading = data.isWalletInitializing || (isConnected && data.isLoading);

  return (
    <EarnPageLayout>
      {isConnected && (
        <ErrorBoundary id="SolanaEarnPortfolio-EarningsOverview" variant="block" wrapperClassName="rounded-t-8">
          <SolanaEarningsOverview data={data} />
        </ErrorBoundary>
      )}
      {areAssetsLoading ? (
        <Loader />
      ) : (
        <ErrorBoundary id="SolanaEarnPortfolio-AssetsList" variant="block" wrapperClassName="rounded-t-8">
          <SolanaAssetsList data={data} chainId={chainId} />
        </ErrorBoundary>
      )}
    </EarnPageLayout>
  );
}
