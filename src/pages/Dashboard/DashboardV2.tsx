import { Trans, t } from "@lingui/macro";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { USD_DECIMALS } from "config/factors";

import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useGmxPrice, useTotalGmxInLiquidity, useTotalGmxSupply } from "domain/legacy";
import { useInfoTokens } from "domain/tokens";
import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { GLP_DECIMALS, GMX_DECIMALS, getPageTitle } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import { useTradePageVersion } from "lib/useTradePageVersion";
import useWallet from "lib/wallets/useWallet";
import { getWhitelistedV1Tokens } from "sdk/configs/tokens";
import { useDashboardChainStatsMulticall } from "./useDashboardChainStatsMulticall";

import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Footer from "components/Footer/Footer";
import PageTitle from "components/PageTitle/PageTitle";
import { MarketsList } from "components/Synthetics/MarketsList/MarketsList";
import { DashboardPageTitle } from "./DashboardPageTitle";
import { GlpCard } from "./GlpCard";
import { GmCard } from "./GmCard";
import { GmxCard } from "./GmxCard";
import { MarketsListV1 } from "./MarketsListV1";
import { OverviewCard } from "./OverviewCard";
import { StatsCard } from "./StatsCard";

import "./DashboardV2.css";

export const ACTIVE_CHAIN_IDS = [ARBITRUM, AVALANCHE];

export default function DashboardV2() {
  const { active, signer } = useWallet();
  const { chainId } = useChainId();

  const [tradePageVersion] = useTradePageVersion();

  const isV1 = tradePageVersion === 1;
  const isV2 = tradePageVersion === 2;

  let { total: totalGmxSupply } = useTotalGmxSupply();

  const statsArbitrum = useDashboardChainStatsMulticall(ARBITRUM);
  const statsAvalanche = useDashboardChainStatsMulticall(AVALANCHE);

  const tokenWeightsArbitrum = statsArbitrum?.vault.totalTokenWeights;
  const tokenWeightsAvalanche = statsAvalanche?.vault.totalTokenWeights;
  const totalTokenWeights = chainId === ARBITRUM ? tokenWeightsArbitrum : tokenWeightsAvalanche;

  const glpTvlArbitrum = statsArbitrum?.glp.aum;
  const glpTvlAvalanche = statsAvalanche?.glp.aum;

  const glpSupplyArbitrum = statsArbitrum?.reader.tokenBalancesWithSupplies?.glpSupply;
  const glpSupplyAvalanche = statsAvalanche?.reader.tokenBalancesWithSupplies?.glpSupply;
  const glpSupply = chainId === ARBITRUM ? glpSupplyArbitrum : glpSupplyAvalanche;

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

  const glpPriceArbitrum =
    glpTvlArbitrum !== undefined && glpTvlArbitrum > 0n && glpSupplyArbitrum !== undefined
      ? bigMath.mulDiv(glpTvlArbitrum, expandDecimals(1, GLP_DECIMALS), glpSupplyArbitrum)
      : expandDecimals(1, USD_DECIMALS);
  const glpPriceAvalanche =
    glpTvlAvalanche !== undefined && glpTvlAvalanche > 0n && glpSupplyAvalanche !== undefined
      ? bigMath.mulDiv(glpTvlAvalanche, expandDecimals(1, GLP_DECIMALS), glpSupplyAvalanche)
      : expandDecimals(1, USD_DECIMALS);
  const glpPrice = chainId === ARBITRUM ? glpPriceArbitrum : glpPriceAvalanche;

  const glpMarketCapArbitrum =
    glpSupplyArbitrum !== undefined
      ? bigMath.mulDiv(glpPriceArbitrum, glpSupplyArbitrum, expandDecimals(1, GLP_DECIMALS))
      : undefined;
  const glpMarketCapAvalanche =
    glpSupplyAvalanche !== undefined
      ? bigMath.mulDiv(glpPriceAvalanche, glpSupplyAvalanche, expandDecimals(1, GLP_DECIMALS))
      : undefined;
  const glpMarketCap = chainId === ARBITRUM ? glpMarketCapArbitrum : glpMarketCapAvalanche;

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
    <SEO title={getPageTitle(t`Dashboard`)}>
      <div className="default-container DashboardV2 page-layout">
        <PageTitle
          title={t`Total Stats`}
          showNetworkIcon={false}
          isTop
          qa="dashboard-page"
          subtitle={
            <div>
              <Trans>For detailed stats:</Trans>{" "}
              {chainId === ARBITRUM && <ExternalLink href="https://stats.gmx.io">V1 Analytics</ExternalLink>}
              {chainId === AVALANCHE && <ExternalLink href="https://stats.gmx.io/avalanche">V1 Analytics</ExternalLink>}
              {(chainId === ARBITRUM || chainId === AVALANCHE) && " | "}
              <ExternalLink href="https://dune.com/gmx-io/gmx-analytics">V2 Analytics</ExternalLink>
              {" | "}
              <ExternalLink href="https://app.gmx.io/#/stats">V2 Pools Stats</ExternalLink>.
            </div>
          }
        />
        <div className="DashboardV2-content">
          <div className="DashboardV2-cards">
            <OverviewCard statsArbitrum={statsArbitrum} statsAvalanche={statsAvalanche} />
            <StatsCard statsArbitrum={statsArbitrum} statsAvalanche={statsAvalanche} />
          </div>
          <DashboardPageTitle tradePageVersion={tradePageVersion} />
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
              {isV1 && (
                <GlpCard
                  chainId={chainId}
                  glpPrice={glpPrice}
                  glpSupply={glpSupply}
                  glpMarketCap={glpMarketCap}
                  adjustedUsdgSupply={adjustedUsdgSupply}
                />
              )}
              {isV2 && <GmCard />}
            </div>
            {isV1 && (
              <MarketsListV1
                chainId={chainId}
                infoTokens={infoTokens}
                totalTokenWeights={totalTokenWeights}
                adjustedUsdgSupply={adjustedUsdgSupply}
              />
            )}
            {isV2 && (
              <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="pools">
                <MarketsList />
              </SyntheticsStateContextProvider>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </SEO>
  );
}
