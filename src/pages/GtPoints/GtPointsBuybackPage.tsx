import { useEffect, useState } from "react";

import { AccountRentCard } from "components/GtPoints/Buyback/AccountRentCard";
import { BuybackFaq } from "components/GtPoints/Buyback/BuybackFaq";
import { BuybackHistoryCard } from "components/GtPoints/Buyback/BuybackHistoryCard";
import { BuybackPoolCard, MyParticipationCard } from "components/GtPoints/Buyback/BuybackPoolCards";
import { BuybackSeasonCard } from "components/GtPoints/Buyback/BuybackSeasonCard";
import { SellableQuotaCard } from "components/GtPoints/Buyback/SellableQuotaCard";
import { SellGtModal } from "components/GtPoints/Buyback/SellGtModal";
import { GtPointsColumns, GtPointsPageLayout } from "components/GtPoints/GtPointsPageLayout";
import { useGtPointsData } from "components/GtPoints/useGtPointsData";

export default function GtPointsBuybackPage() {
  const data = useGtPointsData();
  const [isSellOpen, setIsSellOpen] = useState(false);

  // A wallet switch closes Sell GT, so an amount typed for the previous wallet is dropped.
  useEffect(() => {
    setIsSellOpen(false);
  }, [data.account]);

  const isConnected = Boolean(data.account) && !data.isWalletInitializing;
  const isLoading = data.isWalletInitializing || data.isLoading;
  const buyback = data.buyback;
  const season = buyback?.season;

  return (
    <GtPointsPageLayout>
      <GtPointsColumns
        main={
          <>
            <BuybackSeasonCard season={season} isLoading={isLoading} />
            <SellableQuotaCard
              quota={buyback?.quota}
              isConnected={isConnected}
              isLoading={isLoading}
              season={season}
              onSell={() => setIsSellOpen(true)}
            />
            <div className="grid grid-cols-2 gap-8 max-lg:grid-cols-1">
              <BuybackPoolCard pool={buyback?.pool} season={season} isLoading={isLoading} />
              <MyParticipationCard
                participation={buyback?.participation}
                isConnected={isConnected}
                isLoading={isLoading}
              />
            </div>
            <BuybackHistoryCard history={buyback?.history} isLoading={isLoading} />
            <AccountRentCard accounts={buyback?.rentAccounts} isConnected={isConnected} />
          </>
        }
        side={<BuybackFaq />}
      />

      <SellGtModal
        isVisible={isSellOpen}
        setIsVisible={setIsSellOpen}
        availableToSell={buyback?.quota?.availableToSell ?? 0n}
        pool={buyback?.pool}
      />
    </GtPointsPageLayout>
  );
}
