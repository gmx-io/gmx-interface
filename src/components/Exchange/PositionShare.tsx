import { Trans, t } from "@lingui/macro";
import { toPng } from "html-to-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { BiCopy } from "react-icons/bi";
import { FiTwitter } from "react-icons/fi";
import { RiFileDownloadLine } from "react-icons/ri";
import { useCopyToClipboard } from "react-use";

import { useAffiliateCodes } from "domain/referrals/hooks";
import { Token } from "domain/tokens";
import downloadImage from "lib/downloadImage";
import { helperToast } from "lib/helperToast";
import { getRootShareApiUrl, getTwitterIntentURL } from "lib/legacy";
import useLoadImage from "lib/useLoadImage";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionActionEvent } from "lib/userAnalytics/types";

import Button from "components/Button/Button";
import { TrackingLink } from "components/TrackingLink/TrackingLink";

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
  setIsPositionShareModalOpen,
  isPositionShareModalOpen,
  account,
  chainId,
}: Props) {
  const userAffiliateCode = useAffiliateCodes(chainId, account);
  const [uploadedImageInfo, setUploadedImageInfo] = useState<any>();
  const [uploadedImageError, setUploadedImageError] = useState<string | null>(null);
  const [, copyToClipboard] = useCopyToClipboard();
  const sharePositionBgImg = useLoadImage(shareBgImg);
  const cardRef = useRef<HTMLDivElement>(null);
  const tweetLink = getTwitterIntentURL(
    `Latest $\u200a\u200d${indexToken?.symbol} trade on @GMX_IO`,
    getShareURL(uploadedImageInfo, userAffiliateCode)
  );

  useEffect(() => {
    (async function () {
      const element = cardRef.current;
      if (element && userAffiliateCode.success && sharePositionBgImg) {
        // We have to call the toJpeg function multiple times to make sure the canvas renders all the elements like background image
        // @refer https://github.com/tsayen/dom-to-image/issues/343#issuecomment-652831863
        const image = await toPng(element, config)
          .then(() => toPng(element, config))
          .then(() => toPng(element, config));
        try {
          const imageInfo = await fetch(UPLOAD_URL, { method: "POST", body: image }).then((res) => res.json());
          setUploadedImageInfo(imageInfo);
        } catch (error) {
          setUploadedImageInfo(null);
          setUploadedImageError(t`Image generation error, please refresh and try again.`);
        }
      }
    })();
  }, [userAffiliateCode, sharePositionBgImg, cardRef]);

  async function handleDownload() {
    const element = cardRef.current;
    if (!element) return;
    userAnalytics.pushEvent<SharePositionActionEvent>({
      event: "SharePositionAction",
      data: {
        action: "Download",
      },
    });

    const imgBlob = await toPng(element, config)
      .then(() => toPng(element, config))
      .then(() => toPng(element, config));
    downloadImage(imgBlob, "share.png");
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
      label={t`Share Position`}
    >
      <div className="flex flex-col gap-20">
        <PositionShareCard
          entryPrice={entryPrice}
          indexToken={indexToken}
          isLong={isLong}
          leverage={leverage}
          markPrice={markPrice}
          pnlAfterFeesPercentage={pnlAfterFeesPercentage}
          userAffiliateCode={userAffiliateCode}
          ref={cardRef}
          loading={!uploadedImageInfo && !uploadedImageError}
          sharePositionBgImg={sharePositionBgImg}
        />
        {uploadedImageError && <span className="error">{uploadedImageError}</span>}

        <div className="actions">
          <Button variant="secondary" disabled={!uploadedImageInfo} className="mr-15" onClick={handleCopy}>
            <BiCopy className="icon" />
            <Trans>Copy</Trans>
          </Button>
          <Button variant="secondary" disabled={!uploadedImageInfo} className="mr-15" onClick={handleDownload}>
            <RiFileDownloadLine className="icon" />
            <Trans>Download</Trans>
          </Button>
          <TrackingLink onClick={trackShareTwitter}>
            <Button newTab variant="secondary" disabled={!uploadedImageInfo} className="mr-15" to={tweetLink}>
              <FiTwitter className="icon" />
              <Trans>Tweet</Trans>
            </Button>
          </TrackingLink>
        </div>
      </div>
    </Modal>
  );
}

export default PositionShare;
