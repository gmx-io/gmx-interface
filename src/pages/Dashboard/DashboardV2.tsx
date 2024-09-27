import { Trans, t } from "@lingui/macro";
import { useMemo } from "react";

import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { useGmxPrice, useTotalGmxInLiquidity, useTotalGmxStaked, useTotalGmxSupply } from "domain/legacy";
import { GLP_DECIMALS, GMX_DECIMALS, getPageTitle } from "lib/legacy";

import Footer from "components/Footer/Footer";

import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import PageTitle from "components/PageTitle/PageTitle";
import { MarketsList } from "components/Synthetics/MarketsList/MarketsList";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { getIsSyntheticsSupported } from "config/features";
import { TOKEN_COLOR_MAP, getWhitelistedV1Tokens } from "config/tokens";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useInfoTokens } from "domain/tokens";
import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { useMulticall } from "lib/multicall/useMulticall";
import { BN_ZERO, expandDecimals, formatAmount } from "lib/numbers";
import { useTradePageVersion } from "lib/useTradePageVersion";
import useWallet from "lib/wallets/useWallet";
import { DashboardPageTitle } from "./DashboardPageTitle";
import { GlpCard } from "./GlpCard";
import { GmCard } from "./GmCard";
import { GmxCard } from "./GmxCard";
import { OverviewCard } from "./OverviewCard";
import { StatsCard } from "./StatsCard";
import { V1Table } from "./V1Table";
import { buildDashboardRequest, parseDashboardResponse } from "./parseDashboardResponse";

import "./DashboardV2.css";

export const ACTIVE_CHAIN_IDS = [ARBITRUM, AVALANCHE];

export type ChainStats = ReturnType<typeof parseDashboardResponse>;

export default function DashboardV2() {
  const { active, signer } = useWallet();
  const { chainId } = useChainId();

  const [tradePageVersion] = useTradePageVersion();

  const isV1 = tradePageVersion === 1;
  const isV2 = tradePageVersion === 2;

  let { total: totalGmxSupply } = useTotalGmxSupply();

  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const tokenList = whitelistedTokens.filter((t) => !t.isWrapped);
  const visibleTokens = tokenList.filter((t) => !t.isTempHidden);

  const arbitrumData = useMulticall(ARBITRUM, "useArbitrumStats", {
    key: [],
    // refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: buildDashboardRequest,
    parseResponse: parseDashboardResponse,
  });

  const avalancheData = useMulticall(AVALANCHE, "useAvalancheStats", {
    key: [],
    // refreshInterval: CONFIG_UPDATE_INTERVAL,
    request: buildDashboardRequest,
    parseResponse: parseDashboardResponse,
  });

  const suppliesArbitrum = arbitrumData?.data?.reader.tokenBalancesWithSupplies;
  const suppliesAvalanche = avalancheData?.data?.reader.tokenBalancesWithSupplies;
  const totalTokenWeightsArbitrum = arbitrumData?.data?.vault.totalTokenWeights;
  const totalTokenWeightsAvalanche = avalancheData?.data?.vault.totalTokenWeights;
  const totalTokenWeights = chainId === ARBITRUM ? totalTokenWeightsArbitrum : totalTokenWeightsAvalanche;

  const { infoTokens } = useInfoTokens(signer, chainId, active, undefined, undefined);

  // #region Dashboard Math

  const { gmxPrice, gmxPriceFromArbitrum, gmxPriceFromAvalanche } = useGmxPrice(
    chainId,
    { arbitrum: chainId === ARBITRUM ? signer : undefined },
    active
  );

  let { total: totalGmxInLiquidity } = useTotalGmxInLiquidity();

  let { [AVALANCHE]: stakedGmxAvalanche, [ARBITRUM]: stakedGmxArbitrum, total: totalStakedGmx } = useTotalGmxStaked();

  let gmxMarketCap;
  if (gmxPrice !== undefined && totalGmxSupply !== undefined) {
    gmxMarketCap = bigMath.mulDiv(gmxPrice, totalGmxSupply, expandDecimals(1, GMX_DECIMALS));
  }

  let totalStakedGmxUsd;
  if (gmxPrice !== undefined && totalStakedGmx !== undefined) {
    totalStakedGmxUsd = bigMath.mulDiv(totalStakedGmx, gmxPrice, expandDecimals(1, GMX_DECIMALS));
  }

  const stakedGmxArbitrumUsd =
    gmxPriceFromArbitrum !== undefined && stakedGmxArbitrum !== undefined
      ? bigMath.mulDiv(stakedGmxArbitrum, gmxPriceFromArbitrum, expandDecimals(1, GMX_DECIMALS))
      : undefined;

  const stakedGmxAvalancheUsd =
    gmxPriceFromAvalanche !== undefined && stakedGmxAvalanche !== undefined
      ? bigMath.mulDiv(stakedGmxAvalanche, gmxPriceFromAvalanche, expandDecimals(1, GMX_DECIMALS))
      : undefined;

  // #region GLP TVL

  const arbitrumGlpTvl = arbitrumData?.data?.glp.aum;
  const avalancheGlpTvl = avalancheData?.data?.glp.aum;

  // #endregion GLP TVL

  // #region GLP Supply

  const glpSupplyArbitrum = suppliesArbitrum?.glpSupply;
  const glpSupplyAvalanche = suppliesAvalanche?.glpSupply;

  const glpSupply = chainId === ARBITRUM ? glpSupplyArbitrum : glpSupplyAvalanche;

  // #endregion GLP Supply

  // #region GLP Price

  const glpPriceArbitrum =
    arbitrumGlpTvl !== undefined && arbitrumGlpTvl > 0n && glpSupplyArbitrum !== undefined
      ? bigMath.mulDiv(arbitrumGlpTvl, expandDecimals(1, GLP_DECIMALS), glpSupplyArbitrum)
      : expandDecimals(1, USD_DECIMALS);

  const glpPriceAvalanche =
    avalancheGlpTvl !== undefined && avalancheGlpTvl > 0n && glpSupplyAvalanche !== undefined
      ? bigMath.mulDiv(avalancheGlpTvl, expandDecimals(1, GLP_DECIMALS), glpSupplyAvalanche)
      : expandDecimals(1, USD_DECIMALS);

  const glpPrice = chainId === ARBITRUM ? glpPriceArbitrum : glpPriceAvalanche;

  // #endregion GLP Price

  // #region GLP Market Cap

  const glpMarketCapArbitrum =
    glpSupplyArbitrum !== undefined
      ? bigMath.mulDiv(glpPriceArbitrum, glpSupplyArbitrum, expandDecimals(1, GLP_DECIMALS))
      : undefined;

  const glpMarketCapAvalanche =
    glpSupplyAvalanche !== undefined
      ? bigMath.mulDiv(glpPriceAvalanche, glpSupplyAvalanche, expandDecimals(1, GLP_DECIMALS))
      : undefined;

  const glpMarketCap = chainId === ARBITRUM ? glpMarketCapArbitrum : glpMarketCapAvalanche;

  // #endregion GLP Market Cap

  let adjustedUsdgSupply = BN_ZERO;

  for (let i = 0; i < tokenList.length; i++) {
    const token = tokenList[i];
    const tokenInfo = infoTokens[token.address];
    if (tokenInfo && tokenInfo.usdgAmount !== undefined) {
      adjustedUsdgSupply = adjustedUsdgSupply + tokenInfo.usdgAmount;
    }
  }

  // let stakedPercent = 0;

  // if (totalGmxSupply !== undefined && totalGmxSupply !== 0n && totalStakedGmx !== 0n) {
  //   stakedPercent = Number(bigMath.mulDiv(totalStakedGmx, 100n, totalGmxSupply));
  // }

  // let liquidityPercent = 0;

  // if (totalGmxSupply !== undefined && totalGmxSupply !== 0n && totalGmxInLiquidity !== undefined) {
  //   liquidityPercent = Number(bigMath.mulDiv(totalGmxInLiquidity, 100n, totalGmxSupply));
  // }

  const { glpPool, stableGlp, totalGlp } = useMemo(() => {
    let stableGlp = 0;
    let totalGlp = 0;
    const glpPool = tokenList
      .map((token) => {
        const tokenInfo = infoTokens[token.address];
        if (tokenInfo.usdgAmount !== undefined && adjustedUsdgSupply !== undefined && adjustedUsdgSupply > 0) {
          const currentWeightBps = bigMath.mulDiv(
            tokenInfo.usdgAmount,
            BASIS_POINTS_DIVISOR_BIGINT,
            adjustedUsdgSupply
          );
          if (tokenInfo.isStable) {
            stableGlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
          }
          totalGlp += parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`);
          return {
            fullname: token.name,
            name: token.symbol,
            color: TOKEN_COLOR_MAP[token.symbol ?? "default"] ?? TOKEN_COLOR_MAP.default,
            value: parseFloat(`${formatAmount(currentWeightBps, 2, 2, false)}`),
          };
        }
        return null;
      })
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
      .filter(<T extends unknown>(x: T): x is NonNullable<T> => Boolean(x));

    return { glpPool, stableGlp, totalGlp };
  }, [adjustedUsdgSupply, infoTokens, tokenList]);

  let stablePercentage = totalGlp > 0 ? ((stableGlp * 100) / totalGlp).toFixed(2) : "0.0";

  // #endregion Dashboard Math

  return (
    <SEO title={getPageTitle(t`Dashboard`)}>
      <div className="default-container DashboardV2 page-layout">
        <PageTitle
          title={t`Stats`}
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
            <OverviewCard />
            <StatsCard />
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
                totalStakedGmxUsd={totalStakedGmxUsd}
                stakedGmxArbitrumUsd={stakedGmxArbitrumUsd}
                stakedGmxAvalancheUsd={stakedGmxAvalancheUsd}
                stakedGmxArbitrum={stakedGmxArbitrum}
                stakedGmxAvalanche={stakedGmxAvalanche}
                gmxMarketCap={gmxMarketCap}
                totalStakedGmx={totalStakedGmx}
                totalGmxInLiquidity={totalGmxInLiquidity}
              />
              {isV1 && (
                <GlpCard
                  chainId={chainId}
                  glpPrice={glpPrice}
                  glpSupply={glpSupply}
                  glpMarketCap={glpMarketCap}
                  stablePercentage={stablePercentage}
                  glpPool={glpPool}
                />
              )}
              {isV2 && <GmCard />}
            </div>
            {isV1 && visibleTokens.length > 0 && (
              <V1Table
                chainId={chainId}
                visibleTokens={visibleTokens}
                infoTokens={infoTokens}
                adjustedUsdgSupply={adjustedUsdgSupply}
                totalTokenWeights={totalTokenWeights}
              />
            )}
            {isV2 && getIsSyntheticsSupported(chainId) && (
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
