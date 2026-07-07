import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useMemo, useRef, useState } from "react";
import type { Address } from "viem";

import type { ContractsChainId } from "config/chains";
import { usePnlSummaryData } from "domain/synthetics/accountStats";
import useLoadImage from "lib/useLoadImage";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Loader from "components/Loader/Loader";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import CreateReferralCode from "components/ShareModal/CreateReferralCode";
import { ShareCardActionButtons } from "components/ShareModal/ShareCardActionButtons";
import { ShareCardFrame } from "components/ShareModal/ShareCardFrame";
import { SkipReferralCodeBanner } from "components/ShareModal/SkipReferralCodeBanner";
import { useShareCardActions } from "components/ShareModal/useShareCardActions";
import { useShareReferralCodeState } from "components/ShareModal/useShareReferralCodeState";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import shareBgImg from "img/performance-share-bg.webp";

import { PerformanceShareCard } from "./PerformanceShareCard";
import { PNL_SUMMARY_BUCKET_LABELS, getPnlSummaryBucketForFromDate } from "./pnlSummaryBuckets";
import { usePnlHistoricalData } from "./usePnlHistoricalData";

type Props = {
  chainId: ContractsChainId;
  account: Address;
  fromDate: Date | undefined;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
};

export function PerformanceShare({ chainId, account, fromDate, isOpen, setIsOpen }: Props) {
  const { _ } = useLingui();

  const [showPnlAmounts, setShowPnlAmounts] = useState(true);
  const sharePerformanceBgImg = useLoadImage(shareBgImg);
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    shareAffiliateCode,
    referralCodeOwnerKind,
    code,
    shouldShowCreateReferralCard,
    shouldPromptToCreateReferralCode,
    shouldShowSkipReferralCodeBanner,
    closeCreateReferralCodeInfoMessage,
    handleReferralCodeSuccess,
    handlePromptToCreateReferralCode,
  } = useShareReferralCodeState({
    chainId,
    account,
    isOpen,
    source: "account-dashboard",
  });

  const { isUploading, uploadError, handleCopy, handleCopyImage, handleShareTwitter } = useShareCardActions({
    cardRef,
    shareAffiliateCode,
    source: "account-dashboard",
    fileName: "GMX Performance.png",
    tweetText: `Trading performance on @GMX_IO`,
  });

  const bucket = useMemo(() => getPnlSummaryBucketForFromDate(fromDate), [fromDate]);
  const periodLabel = _(PNL_SUMMARY_BUCKET_LABELS[bucket.bucketLabel]);

  const { data: pnlSummaryData, error: summaryError, loading: isSummaryLoading } = usePnlSummaryData(chainId, account);
  const summaryRow = useMemo(
    () => pnlSummaryData.find((row) => row.bucketLabel === bucket.bucketLabel),
    [pnlSummaryData, bucket.bucketLabel]
  );
  const {
    data: pnlHistory,
    error: historyError,
    loading: isHistoryLoading,
  } = usePnlHistoricalData(chainId, account, bucket.fromTimestamp);

  const error = summaryError ?? historyError;
  const isDataLoading = isSummaryLoading || isHistoryLoading;
  const hasData = pnlHistory.length > 0 && summaryRow !== undefined;

  return (
    <ModalWithPortal
      contentClassName="md:!max-w-[500px]"
      isVisible={isOpen}
      setIsVisible={setIsOpen}
      label={t`Share your PnL`}
      contentPadding={false}
      withMobileBottomPosition
    >
      <div className="flex flex-col gap-20 border-b-1/2 border-slate-600 p-20">
        <div className="flex justify-center">
          {hasData ? (
            <PerformanceShareCard
              pnlBps={summaryRow.pnlBps}
              pnlUsd={summaryRow.pnlUsd}
              winsLossesRatioBps={summaryRow.winsLossesRatioBps}
              tradesCount={summaryRow.wins + summaryRow.losses}
              periodLabel={periodLabel}
              pnlHistory={pnlHistory}
              referralCodeOwnerKind={referralCodeOwnerKind}
              code={code}
              ref={cardRef}
              loading={isUploading}
              sharePerformanceBgImg={sharePerformanceBgImg}
              showPnlAmounts={showPnlAmounts}
            />
          ) : (
            <ShareCardFrame
              bgImgUrl={null}
              loading={false}
              cardClassName="flex items-center justify-center bg-slate-800 text-typography-secondary"
            >
              {isDataLoading ? (
                <Loader />
              ) : error ? (
                <div className="max-h-full overflow-auto whitespace-pre-wrap font-mono text-12 text-red-500">
                  {JSON.stringify(error, null, 2)}
                </div>
              ) : (
                <Trans>No data available</Trans>
              )}
            </ShareCardFrame>
          )}
        </div>
        {shouldShowCreateReferralCard && <CreateReferralCode onSuccess={handleReferralCodeSuccess} />}
      </div>
      <div className="flex flex-col gap-12 p-20 pb-0">
        <ToggleSwitch isChecked={showPnlAmounts} setIsChecked={setShowPnlAmounts}>
          <span className="text-14 font-medium text-typography-secondary">
            <Trans>Show PnL amounts</Trans>
          </span>
        </ToggleSwitch>

        {shouldShowSkipReferralCodeBanner && <SkipReferralCodeBanner onClose={closeCreateReferralCodeInfoMessage} />}
      </div>
      <div className="flex flex-col gap-16 p-20 pt-12">
        {uploadError && (
          <AlertInfoCard type="error" hideClose>
            {uploadError}
          </AlertInfoCard>
        )}
        <ShareCardActionButtons
          isUploading={isUploading}
          disabled={!hasData}
          interceptOnClick={shouldPromptToCreateReferralCode ? handlePromptToCreateReferralCode : undefined}
          onCopyLink={handleCopy}
          onCopyImage={handleCopyImage}
          onShareTwitter={handleShareTwitter}
        />
      </div>
    </ModalWithPortal>
  );
}
