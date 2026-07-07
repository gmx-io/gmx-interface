import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useCopyToClipboard } from "react-use";
import type { Address } from "viem";

import type { ContractsChainId } from "config/chains";
import { useAffiliateCodes, useUserReferralCode } from "domain/referrals";
import { usePnlSummaryData } from "domain/synthetics/accountStats";
import { shareOrCopyElementAsImage } from "lib/copyElementAsImage";
import { helperToast } from "lib/helperToast";
import { getTwitterIntentURL } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getShareURL, uploadElementAsShareImage } from "lib/shareImage";
import { useBreakpoints } from "lib/useBreakpoints";
import useLoadImage from "lib/useLoadImage";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionActionEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import Loader from "components/Loader/Loader";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import CreateReferralCode from "components/PositionShare/CreateReferralCode";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import InfoIcon from "img/ic_info.svg?react";
import ShareArrowOutlineIcon from "img/ic_share_arrow_outline.svg?react";
import TwitterIcon from "img/ic_x.svg?react";
import shareBgImg from "img/performance-share-bg.png";

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
  const { account: connectedAccount } = useWallet();
  const isOwnAccount = connectedAccount === account;

  const userAffiliateCode = useAffiliateCodes(chainId, account);
  const { userReferralCodeString: usedReferralCode } = useUserReferralCode(chainId, account);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPnlAmounts, setShowPnlAmounts] = useState(true);
  const [, copyToClipboard] = useCopyToClipboard();
  const { isMobile } = useBreakpoints();
  const sharePerformanceBgImg = useLoadImage(shareBgImg);
  const cardRef = useRef<HTMLDivElement>(null);
  const [createdReferralCode, setCreatedReferralCode] = useState<string | null>(null);
  const [isCreateReferralCodeInfoMessageClosed, setIsCreateReferralCodeInfoMessageClosed] = useLocalStorageSerializeKey(
    "is-create-referral-code-info-message-closed",
    false
  );

  const shareAffiliateCode = useMemo(() => {
    if (createdReferralCode) {
      return { code: createdReferralCode, success: true };
    }
    return userAffiliateCode;
  }, [createdReferralCode, userAffiliateCode]);
  const hasReferralCode = Boolean(shareAffiliateCode?.code);

  const { referralCodeOwnerKind, code } = useMemo(() => {
    if (hasReferralCode && shareAffiliateCode?.code) {
      return { referralCodeOwnerKind: "created" as const, code: shareAffiliateCode.code };
    }
    if (usedReferralCode) {
      return { referralCodeOwnerKind: "used" as const, code: usedReferralCode };
    }
    return { referralCodeOwnerKind: undefined, code: undefined };
  }, [hasReferralCode, shareAffiliateCode?.code, usedReferralCode]);

  const [promptedToCreateReferralCode, setPromptedToCreateReferralCode] = useState(false);

  const bucket = useMemo(() => getPnlSummaryBucketForFromDate(fromDate), [fromDate]);
  const periodLabel = _(PNL_SUMMARY_BUCKET_LABELS[bucket.bucketLabel]);

  const { data: pnlSummaryData, loading: isSummaryLoading } = usePnlSummaryData(chainId, account);
  const summaryRow = useMemo(
    () => pnlSummaryData.find((row) => row.bucketLabel === bucket.bucketLabel),
    [pnlSummaryData, bucket.bucketLabel]
  );
  const { data: pnlHistory, loading: isHistoryLoading } = usePnlHistoricalData(chainId, account, bucket.fromTimestamp);

  const isDataLoading = isSummaryLoading || isHistoryLoading;
  const hasData = pnlHistory.length > 0 && summaryRow !== undefined;

  const uploadAndGetShareUrl = useCallback(async (): Promise<string | undefined> => {
    const element = cardRef.current;
    if (!element) return undefined;

    setIsUploading(true);
    setUploadError(null);
    element.classList.add("image-capture-in-progress");
    try {
      const imageInfo = await uploadElementAsShareImage(element);
      const ref = shareAffiliateCode.success && shareAffiliateCode.code ? shareAffiliateCode.code : undefined;
      return getShareURL(imageInfo.id, ref);
    } catch {
      setUploadError(t`Image generation failed. Refresh and try again.`);
      return undefined;
    } finally {
      element.classList.remove("image-capture-in-progress");
      setIsUploading(false);
    }
  }, [shareAffiliateCode]);

  const shouldShowCreateReferralCard =
    isOwnAccount && userAffiliateCode.success && !userAffiliateCode.code && !createdReferralCode;
  const handleReferralCodeSuccess = useCallback((code: string) => {
    setCreatedReferralCode(code);

    userAnalytics.pushEvent<SharePositionActionEvent>({
      event: "SharePositionAction",
      data: {
        action: "ReferralCodeCreated",
        source: "account-dashboard",
        hasReferralCode: true,
      },
    });
  }, []);

  async function handleCopyImage() {
    const element = cardRef.current;
    if (!element) return;
    userAnalytics.pushEvent<SharePositionActionEvent>({
      event: "SharePositionAction",
      data: {
        action: isMobile ? "ShareImage" : "CopyImage",
        source: "account-dashboard",
        hasReferralCode: hasReferralCode,
      },
    });

    await shareOrCopyElementAsImage({ element, isMobile, fileName: "GMX Performance.png" });
  }

  async function handleCopy() {
    userAnalytics.pushEvent<SharePositionActionEvent>({
      event: "SharePositionAction",
      data: {
        action: "Copy",
        source: "account-dashboard",
        hasReferralCode: hasReferralCode,
      },
    });

    const url = await uploadAndGetShareUrl();
    if (url) {
      copyToClipboard(url);
      helperToast.success(t`Link copied to clipboard`);
    }
  }

  const handleShareTwitter = useCallback(async () => {
    userAnalytics.pushEvent<SharePositionActionEvent>(
      {
        event: "SharePositionAction",
        data: {
          action: "ShareTwitter",
          source: "account-dashboard",
          hasReferralCode: hasReferralCode,
        },
      },
      { instantSend: true }
    );

    const url = await uploadAndGetShareUrl();
    const tweetLink = getTwitterIntentURL(`Trading performance on @GMX_IO`, url);
    window.open(tweetLink, "_blank", "noopener,noreferrer");
  }, [hasReferralCode, uploadAndGetShareUrl]);

  const handlePromptToCreateReferralCode = (e: React.MouseEvent<unknown>) => {
    e.preventDefault();
    setPromptedToCreateReferralCode(true);
  };

  const shouldPromptToCreateReferralCode =
    isOwnAccount && !hasReferralCode && !promptedToCreateReferralCode && !isCreateReferralCodeInfoMessageClosed;

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
          {summaryRow !== undefined && pnlHistory.length > 0 ? (
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
            <div className="flex aspect-[460/240] w-full max-w-[460px] items-center justify-center rounded-9 bg-slate-800 text-typography-secondary">
              {isDataLoading ? <Loader /> : <Trans>No data available</Trans>}
            </div>
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

        {promptedToCreateReferralCode && !isCreateReferralCodeInfoMessageClosed && (
          <ColorfulBanner color="blue" icon={InfoIcon} onClose={() => setIsCreateReferralCodeInfoMessageClosed(true)}>
            <div className="flex flex-col gap-4">
              <span className="font-medium text-blue-300">
                <Trans>Skip creating a referral code?</Trans>
              </span>
              <span className="text-blue-100">
                <Trans>Earn rewards by sharing your referral code</Trans>
              </span>
            </div>
          </ColorfulBanner>
        )}
      </div>
      <div className="flex flex-col gap-16 p-20 pt-12">
        {uploadError && (
          <AlertInfoCard type="error" hideClose>
            {uploadError}
          </AlertInfoCard>
        )}
        <div className="flex gap-12">
          <Button
            variant="secondary"
            disabled={isUploading || !hasData}
            onClick={shouldPromptToCreateReferralCode ? handlePromptToCreateReferralCode : handleCopy}
            size="medium"
            className="grow !text-14"
          >
            <Trans>Copy link</Trans>
            <CopyStrokeIcon className="size-16" />
          </Button>
          <Button
            variant="secondary"
            disabled={!hasData}
            onClick={shouldPromptToCreateReferralCode ? handlePromptToCreateReferralCode : handleCopyImage}
            size="medium"
            className="grow !text-14"
          >
            {isMobile ? (
              <>
                <Trans>Share</Trans>
                <ShareArrowOutlineIcon className="size-16" />
              </>
            ) : (
              <>
                <Trans>Copy image</Trans>
                <CopyStrokeIcon className="size-16" />
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            disabled={isUploading || !hasData}
            onClick={shouldPromptToCreateReferralCode ? handlePromptToCreateReferralCode : handleShareTwitter}
            size="medium"
            className="grow !text-14"
          >
            <Trans>Share on</Trans>
            <TwitterIcon className="size-16" />
          </Button>
        </div>
      </div>
    </ModalWithPortal>
  );
}
