import { t } from "@lingui/macro";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useGmxPrice, useTotalGmxInLiquidity, useTotalGmxSupply } from "domain/legacy";
import { useChainId } from "lib/chains";
import { GMX_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "sdk/utils/bigmath";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import { BuybackDashboard } from "components/Earn/BuybackTracker/BuybackDashboard";
import { MarketsList } from "components/MarketsList/MarketsList";
import PageTitle from "components/PageTitle/PageTitle";

import { GmCard } from "./GmCard";
import { GmxCard } from "./GmxCard";
import { OverviewCard } from "./OverviewCard";
import { StatsCard } from "./StatsCard";
import { useDashboardChainStatsMulticall } from "./useDashboardChainStatsMulticall";

import "./DashboardV2.css";

export const ACTIVE_CHAIN_IDS = [ARBITRUM, AVALANCHE];

export default function DashboardV2() {
  const { active, signer } = useWallet();
  const { chainId } = useChainId();

  let { total: totalGmxSupply } = useTotalGmxSupply();

  const statsArbitrum = useDashboardChainStatsMulticall(ARBITRUM);
  const statsAvalanche = useDashboardChainStatsMulticall(AVALANCHE);

  const { gmxPrice, gmxPriceFromArbitrum, gmxPriceFromAvalanche } = useGmxPrice(
    chainId,
    { arbitrum: chainId === ARBITRUM ? signer : undefined },
    active
  );

  let gmxMarketCap =
    gmxPrice !== undefined && totalGmxSupply !== undefined
      ? bigMath.mulDiv(gmxPrice, totalGmxSupply, expandDecimals(1, GMX_DECIMALS))
      : undefined;

  let { total: totalGmxInLiquidity } = useTotalGmxInLiquidity();

  return (
    <AppPageLayout title={t`Stats`} header={<ChainContentHeader />}>
      <div className="default-container DashboardV2 page-layout flex flex-col gap-20">
        <PageTitle title={t`Total stats`} qa="dashboard-page" />
        <div className="flex flex-col gap-20">
          <div className="DashboardV2-cards">
            <OverviewCard statsArbitrum={statsArbitrum} statsAvalanche={statsAvalanche} />
            <StatsCard />
          </div>
          <h2 className="text-h2 px-12 font-medium">{t`Tokens`}</h2>
          <div className="DashboardV2-token-cards">
            <div className="stats-wrapper stats-wrapper--gmx">
              <GmxCard
                chainId={chainId}
                gmxPrice={gmxPrice}
                gmxPriceFromArbitrum={gmxPriceFromArbitrum}
                gmxPriceFromAvalanche={gmxPriceFromAvalanche}
                totalGmxSupply={totalGmxSupply}
                gmxMarketCap={gmxMarketCap}
                totalGmxInLiquidity={totalGmxInLiquidity}
              />
              <GmCard />
            </div>

            <div className="mt-16">
              <BuybackDashboard gmxPrice={gmxPrice} totalGmxSupply={totalGmxSupply} />
            </div>

            <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="pools">
              <MarketsList />
            </SyntheticsStateContextProvider>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
