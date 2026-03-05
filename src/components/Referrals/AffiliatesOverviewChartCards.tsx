import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useState } from "react";

import { AffiliateReferralStats } from "domain/referrals";
import { TimeRangeInfo } from "domain/synthetics/markets/useTimeRange";
import { formatUsd } from "lib/numbers";

import Tooltip from "components/Tooltip/Tooltip";

import ShareArrowFilledIcon from "img/ic_share_arrow_filled.svg?react";

import { ShareReferralCardModal } from "./ShareReferralCardModal";
import { TradersVolumeChartContainer } from "./TradersVolumeChartContainer";

function OverviewCard({
  label,
  tooltipContent,
  value,
  valueChange,
  isValueChangePositive,
  topRightContent,
  children,
}: {
  label: React.ReactNode;
  tooltipContent?: React.ReactNode;
  value: React.ReactNode;
  valueChange?: React.ReactNode;
  isValueChangePositive?: boolean;
  topRightContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cx("rounded-8 border-1/2 border-stroke-primary bg-slate-950/50 px-20 pb-10 pt-20")}>
      <div className="mb-24 flex items-start justify-between">
        <div>
          <div className="text-body-small mb-4 font-medium text-typography-secondary">
            {tooltipContent ? (
              <Tooltip variant="iconStroke" position="right" content={tooltipContent}>
                {label}
              </Tooltip>
            ) : (
              label
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-24 font-medium text-typography-primary numbers">{value}</div>
            {valueChange && (
              <div
                className={cx("rounded-full px-6 py-2 text-12 font-medium numbers", {
                  "bg-green-900 text-green-500": isValueChangePositive !== false,
                  "bg-red-900 text-red-500": isValueChangePositive === false,
                })}
              >
                {valueChange}
              </div>
            )}
          </div>
        </div>
        {topRightContent}
      </div>
      {children}
    </div>
  );
}

type ChartCardProps = {
  stats?: AffiliateReferralStats;
  isLoading?: boolean;
  timeRangeInfo: TimeRangeInfo;
};

function formatCountDelta(value?: number): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const abs = Math.abs(value);
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}${abs}`;
}

export function TradingVolumeChartCard({ stats, isLoading, timeRangeInfo }: ChartCardProps) {
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);

  return (
    <>
      <OverviewCard
        label={<Trans>Trading volume</Trans>}
        tooltipContent={<Trans>Volume traded by your referred traders.</Trans>}
        value={formatUsd(stats?.summary.volumeUsd ?? 0n)}
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
      </OverviewCard>
      <ShareReferralCardModal
        isVisible={isShareModalVisible}
        setIsVisible={setIsShareModalVisible}
        referralCode="GMX2026"
      />
    </>
  );
}

export function NumberOfTradesChartCard({ stats, isLoading, timeRangeInfo }: ChartCardProps) {
  return (
    <OverviewCard
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
    </OverviewCard>
  );
}

export function TradersReferredChartCard({ stats, isLoading, timeRangeInfo }: ChartCardProps) {
  return (
    <OverviewCard
      label={<Trans>Traders referred</Trans>}
      tooltipContent={<Trans>Number of referred traders gained/lost.</Trans>}
      value={stats?.summary.tradersCount ?? 0}
      valueChange={formatCountDelta(stats?.summary.tradersCountDelta)}
      isValueChangePositive={(stats?.summary.tradersCountDelta ?? 0) >= 0}
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
    </OverviewCard>
  );
}

export function RebatesChartCard({ stats, isLoading, timeRangeInfo }: ChartCardProps) {
  return (
    <OverviewCard
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
    </OverviewCard>
  );
}
