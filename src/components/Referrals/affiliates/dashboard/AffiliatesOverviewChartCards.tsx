import { Trans } from "@lingui/macro";
import { useState } from "react";

import { AffiliateReferralStats } from "domain/referrals";
import { TimeRangeInfo } from "domain/synthetics/markets/useTimeRange";
import { formatBigUsd, formatUsd } from "lib/numbers";

import { OverviewChartCard } from "components/Referrals/shared/cards/ReferralsOverviewChartCard";
import { ShareReferralCardModal } from "components/Referrals/shared/cards/ShareReferralCardModal";
import { TradersVolumeChartContainer } from "components/Referrals/shared/charts/TradersVolumeChartContainer";

import ShareArrowFilledIcon from "img/ic_share_arrow_filled.svg?react";

type BaseChartCardProps = {
  stats?: AffiliateReferralStats;
  isLoading?: boolean;
  timeRangeInfo: TimeRangeInfo;
};

type TradingVolumeChartCardProps = BaseChartCardProps & {
  referralCode?: string;
  traderDiscountPercentage?: string | number;
  totalDiscountsUsd?: bigint;
  hasReferredUsers?: boolean;
};

function formatCountDelta(value?: number): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const abs = Math.abs(value);
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}${abs}`;
}

export function TradingVolumeChartCard({
  stats,
  isLoading,
  timeRangeInfo,
  referralCode,
  traderDiscountPercentage,
  totalDiscountsUsd,
  hasReferredUsers,
}: TradingVolumeChartCardProps) {
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);

  return (
    <>
      <OverviewChartCard
        label={<Trans>Trading volume</Trans>}
        tooltipContent={<Trans>Volume traded by your referred traders.</Trans>}
        value={formatBigUsd(stats?.summary.volumeUsd ?? 0n)}
        valueChange={formatUsd(stats?.summary.volumeUsdDelta, { displayPlus: true })}
        isValueChangePositive={(stats?.summary.volumeUsdDelta ?? 0n) >= 0n}
        topRightContent={
          <button
            type="button"
            className="text-body-small flex items-center gap-3 font-medium text-typography-secondary hover:text-typography-primary"
            onClick={() => setIsShareModalVisible(true)}
          >
            <Trans>Share</Trans> <ShareArrowFilledIcon className="size-12" />
          </button>
        }
      >
        <TradersVolumeChartContainer
          chartType="volume"
          stats={stats}
          isLoading={isLoading}
          timeRangeInfo={timeRangeInfo}
        />
      </OverviewChartCard>
      <ShareReferralCardModal
        isVisible={isShareModalVisible}
        setIsVisible={setIsShareModalVisible}
        referralCode={referralCode ?? ""}
        traderDiscountPercentage={traderDiscountPercentage}
        totalDiscountsUsd={totalDiscountsUsd}
        hasReferredUsers={hasReferredUsers}
      />
    </>
  );
}

export function NumberOfTradesChartCard({ stats, isLoading, timeRangeInfo }: BaseChartCardProps) {
  return (
    <OverviewChartCard
      label={<Trans>Number of Trades from Referrals</Trans>}
      tooltipContent={<Trans>Number of trades done by your referred traders.</Trans>}
      value={stats?.summary.tradesCount ?? 0}
      valueChange={formatCountDelta(stats?.summary.tradesCountDelta)}
      isValueChangePositive={(stats?.summary.tradesCountDelta ?? 0) >= 0}
    >
      <TradersVolumeChartContainer
        chartType="trades"
        stats={stats}
        isLoading={isLoading}
        timeRangeInfo={timeRangeInfo}
      />
    </OverviewChartCard>
  );
}

export function TradersReferredChartCard({ stats, isLoading, timeRangeInfo }: BaseChartCardProps) {
  return (
    <OverviewChartCard
      label={<Trans>Traders referred</Trans>}
      tooltipContent={<Trans>Net referred traders in the selected period (gained - lost).</Trans>}
      value={stats?.summary.tradersNet ?? 0}
      valueChange={formatCountDelta(stats?.summary.tradersNetDelta)}
      isValueChangePositive={(stats?.summary.tradersNetDelta ?? 0) >= 0}
      topRightContent={
        <div className="text-body-small flex items-center gap-[13px] font-medium text-typography-secondary">
          <span className="flex items-center gap-[9px]">
            <span className="size-[6px] shrink-0 rounded-full bg-green-500" />
            <Trans>Gained</Trans>
          </span>
          <span className="flex items-center gap-[9px]">
            <span className="size-[6px] shrink-0 rounded-full bg-red-500" />
            <Trans>Lost</Trans>
          </span>
        </div>
      }
    >
      <TradersVolumeChartContainer
        chartType="tradersReferred"
        stats={stats}
        isLoading={isLoading}
        timeRangeInfo={timeRangeInfo}
      />
    </OverviewChartCard>
  );
}

export function RebatesChartCard({ stats, isLoading, timeRangeInfo }: BaseChartCardProps) {
  return (
    <OverviewChartCard
      label={<Trans>Rebates</Trans>}
      tooltipContent={<Trans>Rebates earned as an affiliate.</Trans>}
      value={formatUsd(stats?.summary.rebatesUsd ?? 0n)}
      valueChange={formatUsd(stats?.summary.rebatesUsdDelta, {
        displayPlus: true,
      })}
      isValueChangePositive={(stats?.summary.rebatesUsdDelta ?? 0n) >= 0n}
    >
      <TradersVolumeChartContainer
        chartType="rebates"
        stats={stats}
        isLoading={isLoading}
        timeRangeInfo={timeRangeInfo}
      />
    </OverviewChartCard>
  );
}
