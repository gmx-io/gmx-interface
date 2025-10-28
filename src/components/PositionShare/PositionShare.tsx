import { Trans, t } from "@lingui/macro";
import { toJpeg } from "html-to-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCopyToClipboard, usePrevious } from "react-use";

import { useAffiliateCodes } from "domain/referrals";
import { Token } from "domain/tokens";
import downloadImage from "lib/downloadImage";
import { helperToast } from "lib/helperToast";
import { getRootShareApiUrl, getTwitterIntentURL } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import useLoadImage from "lib/useLoadImage";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionActionEvent, SharePositionActionSource } from "lib/userAnalytics/types";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import AlertIcon from "img/ic_alert.svg?react";
import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import DownloadIcon from "img/ic_download2.svg?react";
import TwitterIcon from "img/ic_x.svg?react";
import shareBgImg from "img/position-share-bg.jpg";

import CreateReferralCode from "./CreateReferralCode";
import { PositionShareCard } from "./PositionShareCard";

const ROOT_SHARE_URL = getRootShareApiUrl();
const UPLOAD_URL = ROOT_SHARE_URL + "/api/upload";
const UPLOAD_SHARE = ROOT_SHARE_URL + "/api/s";
const config = { quality: 0.95, canvasWidth: 460, canvasHeight: 240, type: "image/jpeg" };

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
  const userAffiliateCode = useAffiliateCodes(chainId, account);
  const [uploadedImageInfo, setUploadedImageInfo] = useState<any>();
  const [uploadedImageError, setUploadedImageError] = useState<string | null>(null);
  const [showPnlAmounts, setShowPnlAmounts] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const sharePositionBgImg = useLoadImage(shareBgImg);
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
  const shareSourceWithFallback: SharePositionActionSource = shareSource ?? "unknown";
  const hasExistingReferralCode = Boolean(userAffiliateCode?.code);
  const hasCurrentReferralCode = Boolean(shareAffiliateCode?.code);

  const [promptedToCreateReferralCode, setPromptedToCreateReferralCode] = useState(false);

  const tweetLink = getTwitterIntentURL(
    `Latest $\u200a${indexToken?.symbol} trade on @GMX_IO`,
    getShareURL(uploadedImageInfo, shareAffiliateCode)
  );

  const prevIsOpen = usePrevious(isPositionShareModalOpen);

  // cache position on open to not upload new image on every position change
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
    if (prevIsOpen && !isPositionShareModalOpen) {
      setPromptedToCreateReferralCode(false);
    }
  }, [prevIsOpen, isPositionShareModalOpen]);

  useEffect(() => {
    if (prevIsOpen && !isPositionShareModalOpen && shareSourceWithFallback === "auto-prompt") {
      userAnalytics.pushEvent<SharePositionActionEvent>({
        event: "SharePositionAction",
        data: {
          action: "PromptClose",
          source: shareSourceWithFallback,
          hasReferralCode: hasCurrentReferralCode,
          doNotShowAgain,
        },
      });
    }
  }, [prevIsOpen, isPositionShareModalOpen, hasCurrentReferralCode, shareSourceWithFallback, doNotShowAgain]);

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

  const shouldShowCreateReferralCard = userAffiliateCode.success && !userAffiliateCode.code && !createdReferralCode;
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
    },
    [onDoNotShowAgainChange]
  );

  const handlePromptToCreateReferralCode = (e: React.MouseEvent<unknown>) => {
    e.preventDefault();
    setPromptedToCreateReferralCode(true);
  };

  const shouldPromptToCreateReferralCode =
    !hasCurrentReferralCode && !promptedToCreateReferralCode && !isCreateReferralCodeInfoMessageClosed;

  return (
    <ModalWithPortal
      contentClassName="md:!max-w-[500px]"
      isVisible={isPositionShareModalOpen}
      setIsVisible={setIsPositionShareModalOpen}
      label={t`Share your successful GMX trade on X`}
      contentPadding={false}
      withMobileBottomPosition
    >
      <div className="flex flex-col gap-20 border-b-1/2 border-slate-600 p-20">
        <div className="flex justify-center">
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
        </div>
        {shouldShowCreateReferralCard && <CreateReferralCode onSuccess={handleReferralCodeSuccess} />}
        {uploadedImageError && <AlertInfoCard type="error">{uploadedImageError}</AlertInfoCard>}
      </div>
      {promptedToCreateReferralCode && !isCreateReferralCodeInfoMessageClosed && (
        <div className="p-20 pb-0">
          <ColorfulBanner color="blue" icon={AlertIcon} onClose={() => setIsCreateReferralCodeInfoMessageClosed(true)}>
            <span className="font-medium text-blue-300">
              <Trans>Are you sure you want to skip creating a referral code?</Trans>
            </span>
            <span className="text-blue-100">
              <Trans>It allows you to earn rewards.</Trans>
            </span>
          </ColorfulBanner>
        </div>
      )}
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
            onClick={shouldPromptToCreateReferralCode ? handlePromptToCreateReferralCode : handleCopy}
            size="medium"
            className="grow !text-14"
          >
            <Trans>Copy link</Trans>
            <CopyStrokeIcon className="size-16" />
          </Button>
          <Button
            variant="secondary"
            disabled={!uploadedImageInfo}
            onClick={shouldPromptToCreateReferralCode ? handlePromptToCreateReferralCode : handleDownload}
            size="medium"
            className="grow !text-14"
          >
            <Trans>Download</Trans>
            <DownloadIcon className="size-16" />
          </Button>
          <Button
            newTab
            variant="secondary"
            disabled={!uploadedImageInfo}
            to={tweetLink}
            size="medium"
            className="grow !text-14"
            onClick={shouldPromptToCreateReferralCode ? handlePromptToCreateReferralCode : trackShareTwitter}
          >
            <Trans>Share on</Trans>
            <TwitterIcon className="size-16" />
          </Button>
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
