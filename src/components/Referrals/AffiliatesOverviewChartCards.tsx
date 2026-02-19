import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useState } from "react";

import { USD_DECIMALS } from "config/factors";
import { TimeRangeInfo } from "domain/synthetics/markets/useTimeRange";
import { formatUsd, numberToBigint } from "lib/numbers";

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
  periodStart: number;
  periodEnd: number;
  timeRangeInfo: TimeRangeInfo;
};

export function TradingVolumeChartCard({ periodStart, periodEnd, timeRangeInfo }: ChartCardProps) {
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);

  return (
    <>
      <OverviewCard
        label={<Trans>Trading volume</Trans>}
        tooltipContent={<Trans>Total trading volume from your referrals</Trans>}
        value={formatUsd(numberToBigint(124567.89, USD_DECIMALS))}
        valueChange={formatUsd(numberToBigint(3421.5, USD_DECIMALS), { displayPlus: true })}
        isValueChangePositive={true}
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
        <TradersVolumeChartContainer periodStart={periodStart} periodEnd={periodEnd} timeRangeInfo={timeRangeInfo} />
      </OverviewCard>
      <ShareReferralCardModal
        isVisible={isShareModalVisible}
        setIsVisible={setIsShareModalVisible}
        referralCode="GMX2026"
      />
    </>
  );
}

export function NumberOfTradesChartCard({ periodStart, periodEnd, timeRangeInfo }: ChartCardProps) {
  return (
    <OverviewCard
      label={<Trans>Number of Trades from Referrals</Trans>}
      tooltipContent={<Trans>Total number of trades executed by your referred traders.</Trans>}
      value="1,247"
      valueChange="+89"
      isValueChangePositive={true}
    >
      <TradersVolumeChartContainer periodStart={periodStart} periodEnd={periodEnd} timeRangeInfo={timeRangeInfo} />
    </OverviewCard>
  );
}

export function TradersReferredChartCard({ periodStart, periodEnd, timeRangeInfo }: ChartCardProps) {
  return (
    <OverviewCard
      label={<Trans>Traders referred</Trans>}
      tooltipContent={<Trans>Traders referred</Trans>}
      value="42"
      valueChange="+5"
      isValueChangePositive={true}
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
      <TradersVolumeChartContainer periodStart={periodStart} periodEnd={periodEnd} timeRangeInfo={timeRangeInfo} />
    </OverviewCard>
  );
}

export function RebatesChartCard({ periodStart, periodEnd, timeRangeInfo }: ChartCardProps) {
  return (
    <OverviewCard
      label={<Trans>Rebates</Trans>}
      tooltipContent={<Trans>Your affiliate earnings from referrals</Trans>}
      value={formatUsd(numberToBigint(2847.32, USD_DECIMALS))}
      valueChange={formatUsd(numberToBigint(156.4, USD_DECIMALS), { displayPlus: true })}
      isValueChangePositive={true}
    >
      <TradersVolumeChartContainer periodStart={periodStart} periodEnd={periodEnd} timeRangeInfo={timeRangeInfo} />
    </OverviewCard>
  );
}
