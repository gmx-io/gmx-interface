import { Trans } from "@lingui/macro";
import cx from "classnames";

import { formatBalanceAmount } from "lib/numbers";

import {
  EarningsStat,
  formatUsdExpandedParts,
  UsdStatValue,
} from "components/Earn/Portfolio/EarningsOverview/EarningsStat";
import { Group, LeafRow } from "components/Earn/Portfolio/EarningsOverview/LifetimeEarningsTooltip";
import { EarningValue } from "components/EarningValue/EarningValue";
import { NumericValue } from "components/NumericValue/NumericValue";
import { UsdValue } from "components/NumericValue/UsdValue";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { SOLANA_GT_DECIMALS } from "./solanaEarnTypes";

const MOBILE_ROW_CLASS_NAME = "max-md:flex-row max-md:items-center max-md:justify-between";

export type SolanaPortfolioBreakdown = {
  gmUsd: bigint;
  glvUsd: bigint;
  totalUsd: bigint;
};

export type SolanaGtTotalBreakdown = {
  balance: bigint;
  unclaimedFromStaking: bigint;
  total: bigint;
};

export type SolanaLifetimeBreakdown = {
  gmUsd: bigint;
  glvUsd: bigint;
  gtBuybackUsd: bigint;
  totalUsd: bigint;
};

export function formatGtAmount(amount: bigint) {
  return formatBalanceAmount(amount, SOLANA_GT_DECIMALS, "GT", { showZero: true });
}

function TotalPortfolioValue({
  breakdown,
  isLoading,
  isAvailable,
}: {
  breakdown: SolanaPortfolioBreakdown | undefined;
  isLoading: boolean;
  isAvailable: boolean;
}) {
  const valueElement = <UsdStatValue usd={breakdown?.totalUsd} isLoading={isLoading} isAvailable={isAvailable} />;

  if (!breakdown || isLoading) {
    return valueElement;
  }

  return (
    <TooltipWithPortal
      handle={valueElement}
      content={
        <div className="flex flex-col">
          <StatsTooltipRow
            label={<Trans>GM:</Trans>}
            showDollar={false}
            value={<NumericValue parts={formatUsdExpandedParts(breakdown.gmUsd)} className="numbers" />}
          />
          <StatsTooltipRow
            label={<Trans>GLV:</Trans>}
            showDollar={false}
            value={<NumericValue parts={formatUsdExpandedParts(breakdown.glvUsd)} className="numbers" />}
          />
        </div>
      }
    />
  );
}

function TotalGtValue({
  breakdown,
  isLoading,
  isAvailable,
}: {
  breakdown: SolanaGtTotalBreakdown | undefined;
  isLoading: boolean;
  isAvailable: boolean;
}) {
  const valueElement = (
    <EarningValue value={breakdown?.total} isLoading={isLoading} isAvailable={isAvailable} skeletonWidth={65}>
      {(total) => (
        <span className={cx("numbers", { "text-typography-secondary": total === 0n })}>{formatGtAmount(total)}</span>
      )}
    </EarningValue>
  );

  if (!breakdown || isLoading) {
    return valueElement;
  }

  return (
    <TooltipWithPortal
      handle={valueElement}
      content={
        <div className="flex flex-col">
          <StatsTooltipRow
            label={<Trans>GT balance:</Trans>}
            showDollar={false}
            value={<span className="numbers">{formatGtAmount(breakdown.balance)}</span>}
          />
          <StatsTooltipRow
            label={<Trans>Unclaimed GT from staking:</Trans>}
            showDollar={false}
            value={<span className="numbers">{formatGtAmount(breakdown.unclaimedFromStaking)}</span>}
          />
        </div>
      }
    />
  );
}

function TotalLifetimeEarnedValue({
  breakdown,
  isLoading,
  isAvailable,
}: {
  breakdown: SolanaLifetimeBreakdown | undefined;
  isLoading: boolean;
  isAvailable: boolean;
}) {
  const valueElement = <UsdStatValue usd={breakdown?.totalUsd} isLoading={isLoading} isAvailable={isAvailable} />;

  if (!breakdown || isLoading) {
    return valueElement;
  }

  return (
    <TooltipWithPortal
      handle={valueElement}
      content={
        <div className="flex flex-col gap-8">
          <Group title={<Trans>Lifetime GT rewards</Trans>}>
            <LeafRow label={<Trans>GT buybacks</Trans>} usd={breakdown.gtBuybackUsd} />
          </Group>

          <Group title={<Trans>Lifetime LP rewards</Trans>}>
            <LeafRow label={<Trans>GM pools</Trans>} usd={breakdown.gmUsd} />
            <LeafRow label={<Trans>GLV vaults</Trans>} usd={breakdown.glvUsd} />
          </Group>

          <div className="border-t-1/2 border-slate-600" />

          <StatsTooltipRow
            label={<Trans>Total</Trans>}
            showDollar={false}
            value={<UsdValue usd={breakdown.totalUsd} className="numbers" />}
          />

          <span className="text-typography-tertiary">
            <Trans>GM and GLV include markets you no longer hold</Trans>
          </span>
        </div>
      }
    />
  );
}

export function SolanaEarningsBand({
  portfolioBreakdown,
  gtTotalBreakdown,
  lifetimeBreakdown,
  isLoading,
}: {
  portfolioBreakdown: SolanaPortfolioBreakdown | undefined;
  gtTotalBreakdown: SolanaGtTotalBreakdown | undefined;
  lifetimeBreakdown: SolanaLifetimeBreakdown | undefined;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-20">
      <h3 className="text-body-large font-medium text-typography-primary">
        <Trans>Summary</Trans>
      </h3>

      <div className="flex items-end gap-x-40 gap-y-12 max-md:flex-col max-md:items-stretch">
        <EarningsStat className={MOBILE_ROW_CLASS_NAME} label={<Trans>Total portfolio value</Trans>}>
          <TotalPortfolioValue
            breakdown={portfolioBreakdown}
            isLoading={isLoading}
            isAvailable={Boolean(portfolioBreakdown)}
          />
        </EarningsStat>

        <EarningsStat className={MOBILE_ROW_CLASS_NAME} label={<Trans>Total GT</Trans>}>
          <TotalGtValue breakdown={gtTotalBreakdown} isLoading={isLoading} isAvailable={Boolean(gtTotalBreakdown)} />
        </EarningsStat>

        <EarningsStat className={MOBILE_ROW_CLASS_NAME} label={<Trans>Total lifetime earned</Trans>}>
          <TotalLifetimeEarnedValue
            breakdown={lifetimeBreakdown}
            isLoading={isLoading}
            isAvailable={Boolean(lifetimeBreakdown)}
          />
        </EarningsStat>
      </div>
    </div>
  );
}
