import { useEffect, useRef, useState } from "react";
import { t, Trans } from "@lingui/macro";
import { toJpeg } from "html-to-image";
import cx from "classnames";
import { BiCopy } from "react-icons/bi";
import { RiFileDownloadLine } from "react-icons/ri";
import { FiTwitter } from "react-icons/fi";
import { useCopyToClipboard, useMedia } from "react-use";
import Modal from "../Modal/Modal";
import gmxLogo from "img/gmx-logo-with-name.svg";
import "./PositionShare.css";
import { QRCodeSVG } from "qrcode.react";
import { getHomeUrl, getRootShareApiUrl, getTwitterIntentURL, USD_DECIMALS } from "lib/legacy";
import { useAffiliateCodes } from "domain/referrals";
import SpinningLoader from "../Common/SpinningLoader";
import useLoadImage from "lib/useLoadImage";
import shareBgImg from "img/position-share-bg.png";
import { helperToast } from "lib/helperToast";
import { formatAmount } from "lib/numbers";
import downloadImage from "lib/downloadImage";
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

function PositionShare({ setIsPositionShareModalOpen, isPositionShareModalOpen, positionToShare, account, chainId }) {
  const userAffiliateCode = useAffiliateCodes(chainId, account);
  const [uploadedImageInfo, setUploadedImageInfo] = useState();
  const [uploadedImageError, setUploadedImageError] = useState();
  const [, copyToClipboard] = useCopyToClipboard();
  const sharePositionBgImg = useLoadImage(shareBgImg);
  const positionRef = useRef();
  const tweetLink = getTwitterIntentURL(
    `Latest $${positionToShare?.indexToken?.symbol} trade on @GMX_IO`,
    getShareURL(uploadedImageInfo, userAffiliateCode)
  );

  useEffect(() => {
    (async function () {
      const element = positionRef.current;
      if (element && userAffiliateCode.success && sharePositionBgImg && positionToShare) {
        // We have to call the toJpeg function multiple times to make sure the canvas renders all the elements like background image
        // @refer https://github.com/tsayen/dom-to-image/issues/343#issuecomment-652831863
        const image = await toJpeg(element, config)
          .then(() => toJpeg(element, config))
          .then(() => toJpeg(element, config));
        try {
          const imageInfo = await fetch(UPLOAD_URL, { method: "POST", body: image }).then((res) => res.json());
          setUploadedImageInfo(imageInfo);
        } catch {
          setUploadedImageInfo(null);
          setUploadedImageError(t`Image generation error, please refresh and try again.`);
        }
      }
    })();
  }, [userAffiliateCode, sharePositionBgImg, positionToShare]);

  async function handleDownload() {
    const element = positionRef.current;
    if (!element) return;
    const imgBlob = await toJpeg(element, config)
      .then(() => toJpeg(element, config))
      .then(() => toJpeg(element, config));
    downloadImage(imgBlob, "share.jpeg");
  }

  function handleCopy() {
    if (!uploadedImageInfo) return;
    const url = getShareURL(uploadedImageInfo, userAffiliateCode);
    copyToClipboard(url);
    helperToast.success(t`Link copied to clipboard.`);
  }
  return (
    <Modal
      className="position-share-modal"
      isVisible={isPositionShareModalOpen}
      setIsVisible={setIsPositionShareModalOpen}
      label={t`Share Position`}
    >
      <PositionShareCard
        userAffiliateCode={userAffiliateCode}
        positionRef={positionRef}
        position={positionToShare}
        chainId={chainId}
        account={account}
        uploadedImageInfo={uploadedImageInfo}
        uploadedImageError={uploadedImageError}
        sharePositionBgImg={sharePositionBgImg}
      />
      {uploadedImageError && <span className="error">{uploadedImageError}</span>}

      <div className="actions">
        <button disabled={!uploadedImageInfo} className="mr-base App-button-option" onClick={handleCopy}>
          <BiCopy className="icon" />
          <Trans>Copy</Trans>
        </button>
        <button disabled={!uploadedImageInfo} className="mr-base App-button-option" onClick={handleDownload}>
          <RiFileDownloadLine className="icon" />
          <Trans>Download</Trans>
        </button>
        <div className={cx("tweet-link-container", { disabled: !uploadedImageInfo })}>
          <a
            target="_blank"
            className={cx("tweet-link App-button-option", { disabled: !uploadedImageInfo })}
            rel="noreferrer"
            href={tweetLink}
          >
            <FiTwitter className="icon" />
            <Trans>Tweet</Trans>
          </a>
        </div>
      </div>
    </Modal>
  );
}

function PositionShareCard({
  positionRef,
  position,
  userAffiliateCode,
  uploadedImageInfo,
  uploadedImageError,
  sharePositionBgImg,
}) {
  const isMobile = useMedia("(max-width: 400px)");
  const { code, success } = userAffiliateCode;
  const { deltaAfterFeesPercentageStr, isLong, leverage, indexToken, averagePrice, markPrice } = position;

  const homeURL = getHomeUrl();
  return (
    <div className="relative">
      <div ref={positionRef} className="position-share" style={{ backgroundImage: `url(${sharePositionBgImg})` }}>
        <img className="logo" src={gmxLogo} alt="GMX Logo" />
        <ul className="info">
          <li className="side">{isLong ? "LONG" : "SHORT"}</li>
          <li>{formatAmount(leverage, 4, 2, true)}x&nbsp;</li>
          <li>{indexToken.symbol} USD</li>
        </ul>
        <h3 className="pnl">{deltaAfterFeesPercentageStr}</h3>
        <div className="prices">
          <div>
            <p>Entry Price</p>
            <p className="price">${formatAmount(averagePrice, USD_DECIMALS, 2, true)}</p>
          </div>
          <div>
            <p>Index Price</p>
            <p className="price">${formatAmount(markPrice, USD_DECIMALS, 2, true)}</p>
          </div>
        </div>
        <div className="referral-code">
          <div>
            <QRCodeSVG size={isMobile ? 24 : 32} value={success && code ? `${homeURL}/#/?ref=${code}` : `${homeURL}`} />
          </div>
          <div className="referral-code-info">
            {success && code ? (
              <>
                <p className="label">Referral Code:</p>
                <p className="code">{code}</p>
              </>
            ) : (
              <p className="code">https://gmx.io</p>
            )}
          </div>
        </div>
      </div>
      {!uploadedImageInfo && !uploadedImageError && (
        <div className="image-overlay-wrapper">
          <div className="image-overlay">
            <SpinningLoader />
            <p className="loading-text">
              <Trans>Generating shareable image...</Trans>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PositionShare;
