import { useMemo } from "react";

import { isGlvInfo } from "domain/synthetics/markets/glv";

import { roundEarningsUsd } from "components/Earn/Portfolio/EarningsOverview/earningsMath";
import { LpPanel } from "components/Earn/Portfolio/EarningsOverview/LpPanel";

import { GtPanel } from "./GtPanel";
import {
  SolanaEarningsBand,
  SolanaGtTotalBreakdown,
  SolanaLifetimeBreakdown,
  SolanaPortfolioBreakdown,
} from "./SolanaEarningsBand";
import type { SolanaEarnData } from "./solanaEarnTypes";

export function SolanaEarningsOverview({ data }: { data: SolanaEarnData }) {
  const { gt, lp, assets, isLoading } = data;

  const portfolioBreakdown = useMemo((): SolanaPortfolioBreakdown | undefined => {
    if (isLoading || !gt || !lp) {
      return undefined;
    }

    let gmUsd = 0n;
    let glvUsd = 0n;

    for (const asset of assets) {
      if (isGlvInfo(asset.info)) {
        glvUsd += asset.balances.totalBalanceUsd;
      } else {
        gmUsd += asset.balances.totalBalanceUsd;
      }
    }

    return { gmUsd, glvUsd, totalUsd: roundEarningsUsd(gmUsd) + roundEarningsUsd(glvUsd) };
  }, [assets, gt, isLoading, lp]);

  const gtTotalBreakdown = useMemo((): SolanaGtTotalBreakdown | undefined => {
    if (isLoading || !gt) {
      return undefined;
    }

    return {
      balance: gt.balance,
      unclaimedFromStaking: gt.unclaimedFromStaking,
      total: gt.balance + gt.unclaimedFromStaking,
    };
  }, [gt, isLoading]);

  const lifetimeBreakdown = useMemo((): SolanaLifetimeBreakdown | undefined => {
    if (isLoading || !gt || !lp) {
      return undefined;
    }

    return {
      gmUsd: lp.gmLifetimeUsd,
      glvUsd: lp.glvLifetimeUsd,
      gtBuybackUsd: gt.lifetimeBuybackUsd,
      totalUsd:
        roundEarningsUsd(lp.gmLifetimeUsd) +
        roundEarningsUsd(lp.glvLifetimeUsd) +
        roundEarningsUsd(gt.lifetimeBuybackUsd),
    };
  }, [gt, isLoading, lp]);

  const lpLifetimeUsd = lp ? roundEarningsUsd(lp.gmLifetimeUsd) + roundEarningsUsd(lp.glvLifetimeUsd) : undefined;
  const isLpUnavailable = !isLoading && !lp;

  return (
    <div className="flex flex-col gap-8">
      <SolanaEarningsBand
        portfolioBreakdown={portfolioBreakdown}
        gtTotalBreakdown={gtTotalBreakdown}
        lifetimeBreakdown={lifetimeBreakdown}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <GtPanel gt={gt} isLoading={isLoading} />
        <LpPanel
          lifetimeUsd={lpLifetimeUsd}
          last7dUsd={lp?.last7dUsd}
          gmLifetimeUsd={lp?.gmLifetimeUsd}
          glvLifetimeUsd={lp?.glvLifetimeUsd}
          expected365dUsd={lp?.expected365dUsd}
          isLoading={isLoading}
          isUnavailable={isLpUnavailable}
          isGmUnattributed={false}
          isGlvUnattributed={false}
          isExpected365dLoading={false}
          isExpected365dUnavailable={false}
        />
      </div>
    </div>
  );
}
