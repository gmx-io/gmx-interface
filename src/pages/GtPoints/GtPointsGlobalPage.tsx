import { GlobalStats } from "components/GtPoints/Global/GlobalStats";
import { GtMintingChart } from "components/GtPoints/Global/GtMintingChart";
import { TopHolders } from "components/GtPoints/Global/TopHolders";
import { GtPointsPageLayout } from "components/GtPoints/GtPointsPageLayout";
import { useGtPointsData } from "components/GtPoints/useGtPointsData";

export default function GtPointsGlobalPage() {
  const data = useGtPointsData();
  // Global data doesn't need a wallet.
  const isLoading = data.isLoading && !data.global;

  return (
    <GtPointsPageLayout>
      <GlobalStats global={data.global} isLoading={isLoading} />
      <GtMintingChart points={data.global?.chart} />
      <TopHolders holders={data.global?.holders} account={data.account} isLoading={isLoading} />
    </GtPointsPageLayout>
  );
}
