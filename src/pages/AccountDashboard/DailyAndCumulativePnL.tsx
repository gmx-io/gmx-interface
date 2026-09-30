import { Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";

import type { ContractsChainId } from "config/chains";
import { useChainId } from "lib/chains";
import { toUtcDayEndByCalendarDate, toUtcDayStartByCalendarDate, type DateRange, type SetDateRange } from "lib/dates";
import downloadImage from "lib/downloadImage";
import { helperToast } from "lib/helperToast";
import { formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";
import { userAnalytics } from "lib/userAnalytics";
import type { SharePositionClickEvent } from "lib/userAnalytics/types";
import { getPositiveOrNegativeClass } from "lib/utils";
import useWallet from "lib/wallets/useWallet";

import { getDefaultPnlChartGrouping, groupPnlHistoryData, type PnlChartGrouping } from "./DailyAndCumulativePnL.utils";
import { DailyAndCumulativePnLChart } from "./DailyAndCumulativePnLChart";
import { DailyAndCumulativePnLControls } from "./DailyAndCumulativePnLControls";
import { DebugLegend } from "./dailyAndCumulativePnLDebug";
import { PerformanceShare } from "./PerformanceShare";
import { usePnlHistoricalData } from "./usePnlHistoricalData";

import "./DailyAndCumulativePnL.css";

export function DailyAndCumulativePnL({
  chainId,
  account,
  dateRange,
  setDateRange,
}: {
  chainId: ContractsChainId;
  account: Address;
  dateRange: DateRange;
  setDateRange: SetDateRange;
}) {
  const [fromDate, toDate] = dateRange;
  const fromTimestamp = useMemo(() => fromDate && toUtcDayStartByCalendarDate(fromDate), [fromDate]);
  const toTimestamp = useMemo(() => toDate && toUtcDayEndByCalendarDate(toDate), [toDate]);
  const [userGrouping, setUserGrouping] = useState<PnlChartGrouping | undefined>(undefined);

  const {
    data: historicalPnlData,
    error,
    loading,
  } = usePnlHistoricalData(chainId, account, fromTimestamp, toTimestamp);
  const grouping = useMemo(
    () => userGrouping ?? getDefaultPnlChartGrouping(historicalPnlData),
    [historicalPnlData, userGrouping]
  );
  const groupedPnlData = useMemo(() => groupPnlHistoryData(historicalPnlData, grouping), [grouping, historicalPnlData]);
  const chartResetKey = `${chainId}:${account}:${fromTimestamp ?? ""}:${toTimestamp ?? ""}:${grouping}`;

  const { cardRef, handleImageDownload } = useImageDownload();
  const { isMobile } = useBreakpoints();
  const { account: connectedAccount } = useWallet();
  const { chainId: walletChainId } = useChainId();
  const isOwnAccount = connectedAccount === account;
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isShareModalMounted, setIsShareModalMounted] = useState(false);
  const [isShareModalUploading, setIsShareModalUploading] = useState(false);
  const [createdReferralCode, setCreatedReferralCode] = useState<string | null>(null);

  const handleShareClick = useCallback(() => {
    userAnalytics.pushEvent<SharePositionClickEvent>({
      event: "SharePositionAction",
      data: {
        action: "SharePositionClick",
      },
    });

    setIsShareModalMounted(true);
    setIsShareModalOpen(true);
  }, []);

  useEffect(() => {
    if (isShareModalOpen || !isShareModalMounted || isShareModalUploading) {
      return;
    }

    const timeoutId = setTimeout(() => setIsShareModalMounted(false), 300);
    return () => clearTimeout(timeoutId);
  }, [isShareModalOpen, isShareModalMounted, isShareModalUploading]);

  useEffect(() => {
    setCreatedReferralCode(null);
  }, [account, walletChainId]);

  useEffect(() => {
    if (!isOwnAccount && !isShareModalUploading) {
      setIsShareModalOpen(false);
      setIsShareModalMounted(false);
    }
  }, [isOwnAccount, isShareModalUploading]);

  const controls = (
    <DailyAndCumulativePnLControls
      startDate={fromDate}
      endDate={toDate}
      grouping={grouping}
      isMobile={isMobile}
      onDateRangeChange={setDateRange}
      onGroupingChange={setUserGrouping}
      onImageDownload={handleImageDownload}
      onShare={isOwnAccount ? handleShareClick : undefined}
    />
  );

  return (
    <div className="flex flex-col rounded-8 bg-slate-900" ref={cardRef}>
      <div className="flex items-center justify-between px-20 py-15">
        <div className="text-20 font-medium">
          <Trans>Daily and cumulative PnL</Trans>
        </div>
        {isMobile ? null : (
          <div data-exclude className="py-8">
            {controls}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-24 px-16 pt-16 text-typography-secondary">
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-4 rounded-full bg-green-500" /> <Trans>Period profit</Trans>
        </div>
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-4 rounded-full bg-red-500" /> <Trans>Period loss</Trans>
        </div>
        <div className="flex items-center gap-8 text-13 font-medium">
          <div className="inline-block size-4 rounded-full bg-blue-300" />{" "}
          <Trans>
            Cumulative PnL{" "}
            <span className={getPositiveOrNegativeClass(groupedPnlData.at(-1)?.cumulativePnl)}>
              {formatUsd(groupedPnlData.at(-1)?.cumulativePnl)}
            </span>
          </Trans>
        </div>
        <DebugLegend lastPoint={groupedPnlData.at(-1)} />
      </div>

      <DailyAndCumulativePnLChart
        groupedPnlData={groupedPnlData}
        grouping={grouping}
        isMobile={isMobile}
        loading={loading}
        error={error}
        resetKey={chartResetKey}
      />

      {isMobile && (
        <div data-exclude className="flex flex-wrap justify-between gap-8 border-t-1/2 border-slate-600 px-16 py-12">
          {controls}
        </div>
      )}

      {isShareModalMounted && (isOwnAccount || isShareModalUploading) && (
        <PerformanceShare
          chainId={chainId}
          walletChainId={walletChainId}
          account={account}
          fromDate={fromDate}
          toDate={toDate}
          isOpen={isShareModalOpen}
          setIsOpen={setIsShareModalOpen}
          createdReferralCode={createdReferralCode}
          setCreatedReferralCode={setCreatedReferralCode}
          onUploadingChange={setIsShareModalUploading}
        />
      )}
    </div>
  );
}

function useImageDownload() {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleImageDownload = useCallback(async () => {
    if (!cardRef.current) {
      helperToast.error("Error in downloading image");
      return;
    }

    const { toPng } = await import("html-to-image");
    toPng(cardRef.current, {
      filter: (element) => {
        if (element.dataset?.exclude) {
          return false;
        }
        return true;
      },
    }).then((dataUri) => {
      downloadImage(dataUri, "daily-and-cumulative-pnl.png");
    });
  }, []);

  return { cardRef, handleImageDownload };
}
