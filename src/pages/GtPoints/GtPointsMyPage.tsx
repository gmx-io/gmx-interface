import { GtPointsColumns, GtPointsPageLayout } from "components/GtPoints/GtPointsPageLayout";
import { GtHistory } from "components/GtPoints/My/GtHistory";
import { GtPointsFaq } from "components/GtPoints/My/GtPointsFaq";
import { UnclaimedGtCard } from "components/GtPoints/My/UnclaimedGtCard";
import { VipTiers } from "components/GtPoints/My/VipTiers";
import { useGtPointsData } from "components/GtPoints/useGtPointsData";

export default function GtPointsMyPage() {
  const data = useGtPointsData();
  const isConnected = Boolean(data.account) && !data.isWalletInitializing;
  const isLoading = data.isWalletInitializing || (isConnected && data.isLoading);

  return (
    <GtPointsPageLayout>
      <GtPointsColumns
        main={
          <>
            <VipTiers balance={data.my?.balance} isConnected={isConnected} isLoading={isLoading} />
            <UnclaimedGtCard
              unclaimedFromStaking={data.my?.unclaimedFromStaking}
              isConnected={isConnected}
              isLoading={isLoading}
            />
            <GtHistory history={data.my?.history} isConnected={isConnected} isLoading={isLoading} />
          </>
        }
        side={<GtPointsFaq />}
      />
    </GtPointsPageLayout>
  );
}
