import { Trans, t } from "@lingui/macro";
import { Link } from "react-router-dom";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useGmxPrice, useTotalGmxInLiquidity, useTotalGmxSupply } from "domain/legacy";
import { useInfoTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { GMX_DECIMALS, getPageTitle } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { getWhitelistedV1Tokens } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import ExternalLink from "components/ExternalLink/ExternalLink";
import PageTitle from "components/PageTitle/PageTitle";
import SEO from "components/Seo/SEO";
import { ChainContentHeader } from "components/Synthetics/ChainContentHeader/ChainContentHeader";
import { MarketsList } from "components/Synthetics/MarketsList/MarketsList";

import V1Icon from "img/ic_v1.svg?react";
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

  const { infoTokens: arbitrumInfoTokens } = useInfoTokens(signer, ARBITRUM, active, undefined, undefined);
  const { infoTokens: avalancheInfoTokens } = useInfoTokens(signer, AVALANCHE, active, undefined, undefined);
  const infoTokens = chainId === ARBITRUM ? arbitrumInfoTokens : avalancheInfoTokens;

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

  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);

  let adjustedUsdgSupply = 0n;
  for (let i = 0; i < tokenList.length; i++) {
    const token = tokenList[i];
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo && tokenInfo.usdgAmount !== undefined) {
      adjustedUsdgSupply = adjustedUsdgSupply + tokenInfo.usdgAmount;
    }
  }

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
                {chainId === ARBITRUM && (
                  <ExternalLink
                    className="flex items-center gap-4 !no-underline hover:text-typography-primary"
                    href="https://stats.gmx.io"
                  >
                    <V1Icon className="size-15" /> Analytics
                  </ExternalLink>
                )}
                {chainId === AVALANCHE && (
                  <ExternalLink
                    className="flex items-center gap-4 !no-underline hover:text-typography-primary"
                    href="https://stats.gmx.io/avalanche"
                  >
                    <V1Icon className="size-15" /> Analytics
                  </ExternalLink>
                )}
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
              <StatsCard statsArbitrum={statsArbitrum} statsAvalanche={statsAvalanche} />
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
