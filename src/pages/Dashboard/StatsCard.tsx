import { Trans } from "@lingui/macro";
import ChainsStatsTooltipRow from "components/StatsTooltip/ChainsStatsTooltipRow";
import TooltipComponent from "components/Tooltip/Tooltip";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { getTokenBySymbol } from "config/tokens";
import { useFeesSummary, useTotalVolume } from "domain/stats";
import useUniqueUsers from "domain/stats/useUniqueUsers";
import useV2Stats from "domain/synthetics/stats/useV2Stats";
import { useInfoTokens } from "domain/tokens";
import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { GLP_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmount } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { useMemo } from "react";
import { ChainStats } from "./DashboardV2";
import { getCurrentFeesUsd } from "./getCurrentFeesUsd";
import { getWhitelistedTokenAddresses } from "./getWhitelistedTokenAddresses";
import { sumBigInts } from "./sumBigInts";

const ethTreasuryFund = expandDecimals(350 + 148 + 384, 18);
const glpTreasuryFund = expandDecimals(660001, 18);
const usdcTreasuryFund = expandDecimals(784598 + 200000, 30);

const hourSeconds = 60 * 60;

export function StatsCard({ arbitrumData, avalancheData }: { arbitrumData?: ChainStats; avalancheData?: ChainStats }) {
  const { active, signer } = useWallet();
  const { chainId } = useChainId();
  const v1TotalVolume = useTotalVolume();

  const v2ArbitrumOverview = useV2Stats(ARBITRUM);
  const v2AvalancheOverview = useV2Stats(AVALANCHE);

  const uniqueUsers = useUniqueUsers();

  const suppliesArbitrum = arbitrumData?.reader.tokenBalancesWithSupplies;
  const suppliesAvalanche = avalancheData?.reader.tokenBalancesWithSupplies;

  const { infoTokens } = useInfoTokens(signer, chainId, active, undefined, undefined);
  const { infoTokens: infoTokensArbitrum } = useInfoTokens(undefined, ARBITRUM, active, undefined, undefined);
  const { infoTokens: infoTokensAvax } = useInfoTokens(undefined, AVALANCHE, active, undefined, undefined);
  const eth = infoTokens[getTokenBySymbol(chainId, "ETH").address];

  // #region Fees

  const v1ArbitrumOldFeesUsd = useMemo(() => {
    if (!arbitrumData?.reader?.fees || !infoTokensArbitrum) {
      return undefined;
    }

    return getCurrentFeesUsd(getWhitelistedTokenAddresses(ARBITRUM), arbitrumData.reader.fees, infoTokensArbitrum);
  }, [arbitrumData?.reader?.fees, infoTokensArbitrum]);

  const v1AvalancheOldFees = useMemo(() => {
    if (!avalancheData?.reader?.fees || !infoTokensAvax) {
      return undefined;
    }

    return getCurrentFeesUsd(getWhitelistedTokenAddresses(AVALANCHE), avalancheData.reader.fees, infoTokensAvax);
  }, [avalancheData?.reader?.fees, infoTokensAvax]);

  const { data: v1RecentFeesSummaryByChain } = useFeesSummary();

  const nowSeconds = parseInt(String(Date.now() / 1000));

  const shouldIncludeArbitrumFees =
    v1RecentFeesSummaryByChain[ARBITRUM]?.lastUpdatedAt &&
    nowSeconds - v1RecentFeesSummaryByChain[ARBITRUM]?.lastUpdatedAt > hourSeconds;

  const v1ArbitrumRecentFeesUsd = expandDecimals(
    BigInt(v1RecentFeesSummaryByChain[ARBITRUM]?.totalFees ?? 0n),
    USD_DECIMALS
  );

  const v1ArbitrumFeesUsd =
    shouldIncludeArbitrumFees && v1ArbitrumOldFeesUsd !== undefined && v1ArbitrumOldFeesUsd > 0n
      ? v1ArbitrumOldFeesUsd + v1ArbitrumRecentFeesUsd
      : v1ArbitrumRecentFeesUsd;

  const shouldIncludeAvalancheFees =
    v1RecentFeesSummaryByChain[AVALANCHE]?.lastUpdatedAt &&
    nowSeconds - v1RecentFeesSummaryByChain[AVALANCHE]?.lastUpdatedAt > hourSeconds;

  const v1AvalancheRecentFees = expandDecimals(
    BigInt(v1RecentFeesSummaryByChain[AVALANCHE]?.totalFees ?? 0n),
    USD_DECIMALS
  );

  const v1Avalanche =
    shouldIncludeAvalancheFees && v1AvalancheOldFees !== undefined && v1AvalancheOldFees > 0n
      ? v1AvalancheOldFees + v1AvalancheRecentFees
      : v1AvalancheRecentFees;

  const totalFeesUsd = sumBigInts(
    v1ArbitrumFeesUsd,
    v1Avalanche,
    v2ArbitrumOverview.totalFees,
    v2AvalancheOverview.totalFees
  );

  // #endregion Fees

  // #region Treasury
  const arbitrumGlpTvl = arbitrumData?.glp.aum;
  const avalancheGlpTvl = avalancheData?.glp.aum;

  const glpSupplyArbitrum = suppliesArbitrum?.glpSupply;
  const glpSupplyAvalanche = suppliesAvalanche?.glpSupply;

  const glpPriceArbitrum =
    arbitrumGlpTvl !== undefined && arbitrumGlpTvl > 0n && glpSupplyArbitrum !== undefined
      ? bigMath.mulDiv(arbitrumGlpTvl, expandDecimals(1, GLP_DECIMALS), glpSupplyArbitrum)
      : expandDecimals(1, USD_DECIMALS);

  const glpPriceAvalanche =
    avalancheGlpTvl !== undefined && avalancheGlpTvl > 0n && glpSupplyAvalanche !== undefined
      ? bigMath.mulDiv(avalancheGlpTvl, expandDecimals(1, GLP_DECIMALS), glpSupplyAvalanche)
      : expandDecimals(1, USD_DECIMALS);

  const glpPrice = chainId === ARBITRUM ? glpPriceArbitrum : glpPriceAvalanche;

  let totalTreasuryFundUsd: bigint | undefined = undefined;

  if (eth && eth.contractMinPrice !== undefined && glpPrice !== undefined) {
    const ethTreasuryFundUsd = bigMath.mulDiv(ethTreasuryFund, eth.contractMinPrice, expandDecimals(1, eth.decimals));
    const glpTreasuryFundUsd = bigMath.mulDiv(glpTreasuryFund, glpPrice, expandDecimals(1, 18));

    totalTreasuryFundUsd = ethTreasuryFundUsd + glpTreasuryFundUsd + usdcTreasuryFund;
  }

  // #endregion Treasury

  const totalFeesEntries = useMemo(
    () => ({
      "V1 Arbitrum": v1ArbitrumFeesUsd,
      "V2 Arbitrum": v2ArbitrumOverview?.totalFees,
      "V1 Avalanche": v1Avalanche,
      "V2 Avalanche": v2AvalancheOverview?.totalFees,
    }),
    [v1ArbitrumFeesUsd, v1Avalanche, v2ArbitrumOverview?.totalFees, v2AvalancheOverview?.totalFees]
  );

  const totalVolumeEntries = useMemo(
    () => ({
      "V1 Arbitrum": v1TotalVolume?.[ARBITRUM],
      "V2 Arbitrum": v2ArbitrumOverview?.totalVolume,
      "V1 Avalanche": v1TotalVolume?.[AVALANCHE],
      "V2 Avalanche": v2AvalancheOverview?.totalVolume,
    }),
    [v1TotalVolume, v2ArbitrumOverview?.totalVolume, v2AvalancheOverview?.totalVolume]
  );

  const uniqueUsersEnttries = useMemo(
    () => ({
      "V1 Arbitrum": uniqueUsers?.[ARBITRUM],
      "V2 Arbitrum": v2ArbitrumOverview?.totalUsers,
      "V1 Avalanche": uniqueUsers?.[AVALANCHE],
      "V2 Avalanche": v2AvalancheOverview?.totalUsers,
    }),
    [uniqueUsers, v2ArbitrumOverview?.totalUsers, v2AvalancheOverview?.totalUsers]
  );

  return (
    <div className="App-card">
      <div className="App-card-title">
        <Trans>Stats</Trans>
      </div>
      <div className="App-card-divider"></div>
      <div className="App-card-content">
        <div className="App-card-row">
          <div className="label">
            <Trans>Fees</Trans>
          </div>
          <div>
            <TooltipComponent
              position="bottom-end"
              className="whitespace-nowrap"
              handle={`$${formatAmount(totalFeesUsd, USD_DECIMALS, 0, true)}`}
              content={<ChainsStatsTooltipRow entries={totalFeesEntries} />}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Volume</Trans>
          </div>
          <div>
            <TooltipComponent
              position="bottom-end"
              className="whitespace-nowrap"
              handle={`$${formatAmount(
                sumBigInts(
                  v1TotalVolume?.[ARBITRUM],
                  v1TotalVolume?.[AVALANCHE],
                  v2ArbitrumOverview?.totalVolume,
                  v2AvalancheOverview?.totalVolume
                ),
                USD_DECIMALS,
                0,
                true
              )}`}
              content={<ChainsStatsTooltipRow entries={totalVolumeEntries} />}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Users</Trans>
          </div>
          <div>
            <TooltipComponent
              position="bottom-end"
              className="whitespace-nowrap"
              handle={formatAmount(
                sumBigInts(
                  uniqueUsers?.[ARBITRUM],
                  uniqueUsers?.[AVALANCHE],
                  v2ArbitrumOverview?.totalUsers,
                  v2AvalancheOverview?.totalUsers
                ),
                0,
                0,
                true
              )}
              content={<ChainsStatsTooltipRow showDollar={false} shouldFormat={false} entries={uniqueUsersEnttries} />}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Treasury</Trans>
          </div>
          <div>${formatAmount(totalTreasuryFundUsd, USD_DECIMALS, 0, true)}</div>
        </div>
      </div>
    </div>
  );
}
