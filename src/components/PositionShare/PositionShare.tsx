import { Trans, t } from "@lingui/macro";
import { toJpeg } from "html-to-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCopyToClipboard, usePrevious } from "react-use";

import { USD_DECIMALS } from "config/factors";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { registerReferralCode, useAffiliateCodes } from "domain/referrals";
import { usePeriodAccountStats } from "domain/synthetics/accountStats";
import { Token } from "domain/tokens";
import { getTimePeriodsInSeconds } from "lib/dates";
import downloadImage from "lib/downloadImage";
import { helperToast } from "lib/helperToast";
import { getRootShareApiUrl, getTwitterIntentURL } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import useLoadImage from "lib/useLoadImage";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionActionEvent, SharePositionActionSource } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import { TrackingLink } from "components/TrackingLink/TrackingLink";

import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import DownloadIcon from "img/ic_download2.svg?react";
import TwitterIcon from "img/ic_x.svg?react";
import shareBgImg from "img/position-share-bg.jpg";

import CreateReferralCode from "./CreateReferralCode";
import { PositionShareCard } from "./PositionShareCard";

const ROOT_SHARE_URL = getRootShareApiUrl();
const UPLOAD_URL = ROOT_SHARE_URL + "/api/upload";
const UPLOAD_SHARE = ROOT_SHARE_URL + "/api/s";
const config = { quality: 0.95, canvasWidth: 518, canvasHeight: 292, type: "image/jpeg" };
const SEVEN_DAY_REFERRAL_VOLUME_THRESHOLD = expandDecimals(5_000_000, USD_DECIMALS);

function getShareURL(imageInfo, ref) {
  if (!imageInfo) return;
  let url = `${UPLOAD_SHARE}?id=${imageInfo.id}`;
  if (ref.success && ref.code) {
    url = url + `&ref=${ref.code}`;
  }
  return url;
}

type Props = {
  entryPrice: bigint | undefined;
  indexToken: Token;
  isLong: boolean;
  leverage: bigint | undefined;
  markPrice: bigint;
  pnlAfterFeesPercentage: bigint;
  pnlAfterFeesUsd: bigint;
  setIsPositionShareModalOpen: (isOpen: boolean) => void;
  isPositionShareModalOpen: boolean;
  account: string | undefined | null;
  chainId: number;
  doNotShowAgain?: boolean;
  onDoNotShowAgainChange?: (value: boolean) => void;
  onShareAction?: () => void;
  shareSource?: SharePositionActionSource;
};

function PositionShare({
  entryPrice,
  indexToken,
  isLong,
  leverage,
  markPrice,
  pnlAfterFeesPercentage,
  pnlAfterFeesUsd,
  setIsPositionShareModalOpen,
  isPositionShareModalOpen,
  account,
  chainId,
  doNotShowAgain = false,
  onDoNotShowAgainChange,
  onShareAction,
  shareSource,
}: Props) {
  const normalizedAccount = account ?? undefined;
  const userAffiliateCode = useAffiliateCodes(chainId, account);
  const weekPeriod = useMemo(() => getTimePeriodsInSeconds().week, []);
  const { data: lastWeekAccountStats } = usePeriodAccountStats(chainId, {
    account: normalizedAccount,
    from: weekPeriod[0],
    to: weekPeriod[1],
    enabled: Boolean(normalizedAccount),
  });
  const hasSevenDayVolume =
    normalizedAccount !== undefined && (lastWeekAccountStats?.volume ?? 0n) >= SEVEN_DAY_REFERRAL_VOLUME_THRESHOLD;
  const { signer } = useWallet();
  const { pendingTxns } = usePendingTxns();
  const [uploadedImageInfo, setUploadedImageInfo] = useState<any>();
  const [uploadedImageError, setUploadedImageError] = useState<string | null>(null);
  const [showPnlAmounts, setShowPnlAmounts] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const sharePositionBgImg = useLoadImage(shareBgImg);
  const cardRef = useRef<HTMLDivElement>(null);
  const [createdReferralCode, setCreatedReferralCode] = useState<string | null>(null);
  const shareAffiliateCode = useMemo(() => {
    if (createdReferralCode) {
      return { code: createdReferralCode, success: true };
    }
    return userAffiliateCode;
  }, [createdReferralCode, userAffiliateCode]);
  const shareSourceWithFallback: SharePositionActionSource = shareSource ?? "unknown";
  const hasExistingReferralCode = Boolean(userAffiliateCode?.code);
  const hasCurrentReferralCode = Boolean(shareAffiliateCode?.code);

  const tweetLink = getTwitterIntentURL(
    `Latest $\u200a${indexToken?.symbol} trade on @GMX_IO`,
    getShareURL(uploadedImageInfo, shareAffiliateCode)
  );

  const prevIsOpen = usePrevious(isPositionShareModalOpen);

  const [cachedPositionData, setCachedPositionData] = useState<{
    entryPrice: bigint | undefined;
    indexToken: Token;
    isLong: boolean;
    leverage: bigint | undefined;
    markPrice: bigint;
    pnlAfterFeesPercentage: bigint;
    pnlAfterFeesUsd: bigint;
  } | null>(null);

  useEffect(() => {
    if (!prevIsOpen && isPositionShareModalOpen) {
      setCachedPositionData({
        entryPrice,
        indexToken,
        isLong,
        leverage,
        markPrice,
        pnlAfterFeesPercentage,
        pnlAfterFeesUsd,
      });
    }
  }, [
    isPositionShareModalOpen,
    entryPrice,
    indexToken,
    isLong,
    leverage,
    markPrice,
    pnlAfterFeesPercentage,
    pnlAfterFeesUsd,
    prevIsOpen,
  ]);

  useEffect(() => {
    if (!prevIsOpen && isPositionShareModalOpen && shareSource === "auto-prompt") {
      userAnalytics.pushEvent<SharePositionActionEvent>({
        event: "SharePositionAction",
        data: {
          action: "PromptShown",
          source: "auto-prompt",
          hasReferralCode: hasExistingReferralCode,
        },
      });
    }
  }, [hasExistingReferralCode, isPositionShareModalOpen, prevIsOpen, shareSource]);

  useEffect(() => {
    if (userAffiliateCode.code) {
      setCreatedReferralCode(null);
    }
  }, [userAffiliateCode.code]);

  useEffect(() => {
    (async function () {
      const element = cardRef.current;
      setUploadedImageInfo(null);
      if (element && shareAffiliateCode.success && sharePositionBgImg && cachedPositionData) {
        // We have to call the toJpeg function multiple times to make sure the canvas renders all the elements like background image
        // @refer https://github.com/tsayen/dom-to-image/issues/343#issuecomment-652831863
        const image = await toJpeg(element, config)
          .then(() => toJpeg(element, config))
          .then(() => toJpeg(element, config));
        try {
          const imageInfo = await fetch(UPLOAD_URL, { method: "POST", body: image }).then((res) => res.json());
          setUploadedImageInfo(imageInfo);
        } catch (error) {
          setUploadedImageInfo(null);
          setUploadedImageError(t`Image generation error, please refresh and try again.`);
        }
      }
    })();
  }, [shareAffiliateCode, sharePositionBgImg, showPnlAmounts, cachedPositionData]);

  const handleCreateReferralCode = useCallback(
    (referralCode: string) => {
      if (!signer) {
        return Promise.reject(new Error("Wallet not connected"));
      }

      return registerReferralCode(chainId, referralCode, signer, {
        sentMsg: t`Referral code submitted.`,
        failMsg: t`Referral code creation failed.`,
        pendingTxns,
      });
    },
    [chainId, pendingTxns, signer]
  );

  const shouldShowCreateReferralCard =
    userAffiliateCode.success && !userAffiliateCode.code && !createdReferralCode && hasSevenDayVolume;
  const handleReferralCodeSuccess = useCallback(
    (code: string) => {
      setCreatedReferralCode(code);

      userAnalytics.pushEvent<SharePositionActionEvent>({
        event: "SharePositionAction",
        data: {
          action: "ReferralCodeCreated",
          source: shareSourceWithFallback,
          hasReferralCode: true,
        },
      });
    },
    [shareSourceWithFallback]
  );
  async function handleDownload() {
    const element = cardRef.current;
    onShareAction?.();
    if (!element) return;
    userAnalytics.pushEvent<SharePositionActionEvent>({
      event: "SharePositionAction",
      data: {
        action: "Download",
        source: shareSourceWithFallback,
        hasReferralCode: hasCurrentReferralCode,
      },
    });

    const imgBlob = await toJpeg(element, config)
      .then(() => toJpeg(element, config))
      .then(() => toJpeg(element, config));
    downloadImage(imgBlob, "share.jpg");
  }

  function handleCopy() {
    onShareAction?.();
    if (!uploadedImageInfo) return;

    userAnalytics.pushEvent<SharePositionActionEvent>({
      event: "SharePositionAction",
      data: {
        action: "Copy",
        source: shareSourceWithFallback,
        hasReferralCode: hasCurrentReferralCode,
      },
    });

    const url = getShareURL(uploadedImageInfo, shareAffiliateCode);
    copyToClipboard(url as string);
    helperToast.success(t`Link copied to clipboard.`);
  }

  const trackShareTwitter = useCallback(() => {
    onShareAction?.();
    userAnalytics.pushEvent<SharePositionActionEvent>(
      {
        event: "SharePositionAction",
        data: {
          action: "ShareTwitter",
          source: shareSourceWithFallback,
          hasReferralCode: hasCurrentReferralCode,
        },
      },
      { instantSend: true }
    );
  }, [hasCurrentReferralCode, onShareAction, shareSourceWithFallback]);

  const handleDoNotShowAgainToggle = useCallback(
    (value: boolean) => {
      onDoNotShowAgainChange?.(value);

      if (value) {
        userAnalytics.pushEvent<SharePositionActionEvent>({
          event: "SharePositionAction",
          data: {
            action: "PromptDontShowAgain",
            source: shareSourceWithFallback,
            hasReferralCode: hasCurrentReferralCode,
          },
        });
      }
    },
    [hasCurrentReferralCode, onDoNotShowAgainChange, shareSourceWithFallback]
  );

  return (
    <ModalWithPortal
      contentClassName="!max-w-[500px]"
      isVisible={isPositionShareModalOpen}
      setIsVisible={setIsPositionShareModalOpen}
      label={t`Share your sucessful GMX trade on X`}
      contentPadding={false}
    >
      <div className="flex flex-col gap-20 border-b-1/2 border-slate-600 p-20">
        {cachedPositionData && (
          <PositionShareCard
            entryPrice={cachedPositionData.entryPrice}
            indexToken={cachedPositionData.indexToken}
            isLong={cachedPositionData.isLong}
            leverage={cachedPositionData.leverage}
            markPrice={cachedPositionData.markPrice}
            pnlAfterFeesPercentage={cachedPositionData.pnlAfterFeesPercentage}
            pnlAfterFeesUsd={cachedPositionData.pnlAfterFeesUsd}
            userAffiliateCode={shareAffiliateCode}
            ref={cardRef}
            loading={!uploadedImageInfo && !uploadedImageError}
            sharePositionBgImg={sharePositionBgImg}
            showPnlAmounts={showPnlAmounts}
          />
        )}
        {shouldShowCreateReferralCard && (
          <CreateReferralCode
            handleCreateReferralCode={handleCreateReferralCode}
            onSuccess={handleReferralCodeSuccess}
          />
        )}
        {uploadedImageError && <AlertInfoCard type="error">{uploadedImageError}</AlertInfoCard>}
      </div>
      <div className="flex flex-col gap-16 p-20">
        <div className="flex flex-col gap-12">
          <ToggleSwitch isChecked={showPnlAmounts} setIsChecked={setShowPnlAmounts}>
            <span className="text-14 font-medium text-typography-secondary">
              <Trans>Show PnL Amounts</Trans>
            </span>
          </ToggleSwitch>
        </div>
        <div className="flex gap-12">
          <Button
            variant="secondary"
            disabled={!uploadedImageInfo}
            onClick={handleCopy}
            size="medium"
            className="grow !text-14"
          >
            <Trans>Copy link</Trans>
            <CopyStrokeIcon className="size-16" />
          </Button>
          <Button
            variant="secondary"
            disabled={!uploadedImageInfo}
            onClick={handleDownload}
            size="medium"
            className="grow !text-14"
          >
            <Trans>Download</Trans>
            <DownloadIcon className="size-16" />
          </Button>
          <TrackingLink onClick={trackShareTwitter}>
            <Button
              newTab
              variant="secondary"
              disabled={!uploadedImageInfo}
              to={tweetLink}
              size="medium"
              className="grow !text-14"
            >
              <Trans>Share on</Trans>
              <TwitterIcon className="size-16" />
            </Button>
          </TrackingLink>
        </div>
        {Boolean(onDoNotShowAgainChange) && (
          <div className="flex justify-center">
            <Checkbox isChecked={doNotShowAgain} setIsChecked={handleDoNotShowAgainToggle}>
              <span className="text-14 font-medium text-typography-secondary">
                <Trans>Don't show this again</Trans>
              </span>
            </Checkbox>
          </div>
        )}
      </div>
    </ModalWithPortal>
  );
}

export default PositionShare;
