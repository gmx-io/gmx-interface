import EarnPageLayout from "pages/Earn/EarnPageLayout";
import { useProcessedData } from "pages/Stake/useProcessedData";

import AssetsList from "components/Earn/Portfolio/AssetsList/AssetsList";
import RewardsBar from "components/Earn/Portfolio/RewardsBar";

export default function EarnPortfolioPage() {
  const { data: processedData, mutate: mutateProcessedData } = useProcessedData();

  return (
    <EarnPageLayout>
      <RewardsBar processedData={processedData} mutateProcessedData={mutateProcessedData} />
      <AssetsList processedData={processedData} />
    </EarnPageLayout>
  );
}
