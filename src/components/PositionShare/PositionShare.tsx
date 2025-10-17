import { Trans, t } from "@lingui/macro";
import { toJpeg } from "html-to-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCopyToClipboard, usePrevious } from "react-use";

import { useAffiliateCodes } from "domain/referrals/hooks";
import { Token } from "domain/tokens";
import downloadImage from "lib/downloadImage";
import { helperToast } from "lib/helperToast";
import { getRootShareApiUrl, getTwitterIntentURL } from "lib/legacy";
import useLoadImage from "lib/useLoadImage";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionActionEvent } from "lib/userAnalytics/types";

import Button from "components/Button/Button";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import { TrackingLink } from "components/TrackingLink/TrackingLink";

import CopyStrokeIcon from "img/ic_copy_stroke.svg?react";
import DownloadIcon from "img/ic_download2.svg?react";
import TwitterIcon from "img/ic_x.svg?react";
import shareBgImg from "img/position-share-bg.jpg";

import { PositionShareCard } from "./PositionShareCard";
import Modal from "../Modal/Modal";

const ROOT_SHARE_URL = getRootShareApiUrl();
const UPLOAD_URL = ROOT_SHARE_URL + "/api/upload";
const UPLOAD_SHARE = ROOT_SHARE_URL + "/api/s";
const config = { quality: 0.95, canvasWidth: 518, canvasHeight: 292, type: "image/jpeg" };

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
}: Props) {
  const userAffiliateCode = useAffiliateCodes(chainId, account);
  const [uploadedImageInfo, setUploadedImageInfo] = useState<any>();
  const [uploadedImageError, setUploadedImageError] = useState<string | null>(null);
  const [showPnlAmounts, setShowPnlAmounts] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const sharePositionBgImg = useLoadImage(shareBgImg);
  const cardRef = useRef<HTMLDivElement>(null);
  const tweetLink = getTwitterIntentURL(
    `Latest $\u200a${indexToken?.symbol} trade on @GMX_IO`,
    getShareURL(uploadedImageInfo, userAffiliateCode)
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
    (async function () {
      const element = cardRef.current;
      setUploadedImageInfo(null);
      if (element && userAffiliateCode.success && sharePositionBgImg && cachedPositionData) {
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
  }, [userAffiliateCode, sharePositionBgImg, showPnlAmounts, cachedPositionData]);

  async function handleDownload() {
    const element = cardRef.current;
    if (!element) return;
    userAnalytics.pushEvent<SharePositionActionEvent>({
      event: "SharePositionAction",
      data: {
        action: "Download",
      },
    });

    const imgBlob = await toJpeg(element, config)
      .then(() => toJpeg(element, config))
      .then(() => toJpeg(element, config));
    downloadImage(imgBlob, "share.jpg");
  }

  function handleCopy() {
    if (!uploadedImageInfo) return;

    userAnalytics.pushEvent<SharePositionActionEvent>({
      event: "SharePositionAction",
      data: {
        action: "Copy",
      },
    });

    const url = getShareURL(uploadedImageInfo, userAffiliateCode);
    copyToClipboard(url as string);
    helperToast.success(t`Link copied to clipboard.`);
  }

  const trackShareTwitter = useCallback(() => {
    userAnalytics.pushEvent<SharePositionActionEvent>(
      {
        event: "SharePositionAction",
        data: {
          action: "ShareTwitter",
        },
      },
      { instantSend: true }
    );
  }, []);

  return (
    <Modal
      className="position-share-modal"
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
            userAffiliateCode={userAffiliateCode}
            ref={cardRef}
            loading={!uploadedImageInfo && !uploadedImageError}
            sharePositionBgImg={sharePositionBgImg}
            showPnlAmounts={showPnlAmounts}
          />
        )}
        {uploadedImageError && <span className="error">{uploadedImageError}</span>}
      </div>
      <div className="flex flex-col gap-16 p-20">
        <div>
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
      </div>
    </Modal>
  );
}

export default PositionShare;
