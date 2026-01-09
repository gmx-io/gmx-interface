import { Trans, t } from "@lingui/macro";
import { Link } from "react-router-dom";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useGmxPrice, useTotalGmxInLiquidity, useTotalGmxSupply } from "domain/gmxToken";
import { useChainId } from "lib/chains";
import { expandDecimals } from "lib/numbers";
import { getPageTitle } from "lib/seo";
import useWallet from "lib/wallets/useWallet";
import { GMX_DECIMALS } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { ChainContentHeader } from "components/ChainContentHeader/ChainContentHeader";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { MarketsList } from "components/MarketsList/MarketsList";
import PageTitle from "components/PageTitle/PageTitle";
import SEO from "components/Seo/SEO";

import V2Icon from "img/ic_v2.svg?react";

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
    <SEO title={getPageTitle(t`Stats`)}>
      <AppPageLayout header={<ChainContentHeader />}>
        <div className="default-container DashboardV2 page-layout flex flex-col gap-20">
          <PageTitle
            title={t`Total Stats`}
            qa="dashboard-page"
            subtitle={
              <div className="flex items-center gap-6 font-medium text-typography-secondary">
                <Trans>For detailed stats</Trans>{" "}
                <ExternalLink
                  className="flex items-center gap-4 !no-underline hover:text-typography-primary"
                  href="https://dune.com/gmx-io/gmx-analytics"
                >
                  <V2Icon className="size-15" /> Analytics
                </ExternalLink>
                <Link
                  className="flex items-center gap-4 text-typography-secondary !no-underline hover:text-typography-primary"
                  to="/monitor"
                >
                  <V2Icon className="size-15" /> Pools Stats
                </Link>
              </div>
            }
          />
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

              <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="pools">
                <MarketsList />
              </SyntheticsStateContextProvider>
            </div>
          </div>
        </div>
      </AppPageLayout>
    </SEO>
  );
}
