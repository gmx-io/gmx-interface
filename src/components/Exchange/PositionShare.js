import { useEffect, useRef, useState } from "react";
import { toJpeg } from "html-to-image";
import cx from "classnames";
import { BiCopy } from "react-icons/bi";
import { RiFileDownloadLine } from "react-icons/ri";
import { FiTwitter } from "react-icons/fi";
import { useCopyToClipboard } from "react-use";
import Modal from "../Modal/Modal";
import gmxLogo from "../../img/gmx-logo-with-name.svg";
import "./PositionShare.css";
import { QRCodeSVG } from "qrcode.react";
import {
  formatAmount,
  getHomeUrl,
  getRootShareApiUrl,
  getTwitterIntentURL,
  helperToast,
  USD_DECIMALS,
} from "../../Helpers";
import { useAffiliateCodes } from "../../Api/referrals";
import SpinningLoader from "../Common/SpinningLoader";

const ROOT_SHARE_URL = getRootShareApiUrl();
// const ROOT_SHARE_URL = "https://share.gmx.io";
const UPLOAD_URL = ROOT_SHARE_URL + "/api/upload";
const UPLOAD_SHARE = ROOT_SHARE_URL + "/api/s";
const config = { quality: 0.95, canvasWidth: 1036, canvasHeight: 584 };

function getShareURL(imageInfo, ref) {
  if (!imageInfo) return;
  let url = `${UPLOAD_SHARE}?id=${imageInfo.id}`;
  if (ref.success) {
    url = url + `&ref=${ref.code}`;
  }
  return url;
}

function PositionShare({ setIsPositionShareModalOpen, isPositionShareModalOpen, positionToShare, account, chainId }) {
  const userAffiliateCode = useAffiliateCodes(chainId, account);
  const [uploadedImageInfo, setUploadedImageInfo] = useState();
  const [uploadedImageError, setUploadedImageError] = useState();
  const [, copyToClipboard] = useCopyToClipboard();
  const positionRef = useRef();
  const tweetLink = getTwitterIntentURL(
    `Latest $${positionToShare?.indexToken?.symbol} trade on @GMX_IO`,
    getShareURL(uploadedImageInfo, userAffiliateCode)
  );

  useEffect(() => {
    (async function () {
      const element = positionRef.current;
      if (!element) return;
      const image = await toJpeg(element, config);
      if (userAffiliateCode.success) {
        try {
          const imageInfo = await fetch(UPLOAD_URL, { method: "POST", body: image }).then((res) => res.json());
          setUploadedImageInfo(imageInfo);
        } catch {
          setUploadedImageInfo(null);
          setUploadedImageError("Image generation error, please refresh and try again.");
        }
      }
    })();
  }, [userAffiliateCode]);

  async function handleDownload() {
    const { indexToken, isLong } = positionToShare;
    const element = positionRef.current;
    if (!element) return;
    const dataUrl = await toJpeg(element, config);
    const link = document.createElement("a");
    link.download = `${indexToken.symbol}-${isLong ? "long" : "short"}.jpeg`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
  }

  function handleCopy() {
    if (!uploadedImageInfo) return;
    const url = getShareURL(uploadedImageInfo, userAffiliateCode);
    copyToClipboard(url);
    helperToast.success("Link copied to clipboard.");
  }
  return (
    <Modal
      className="position-share-modal"
      isVisible={isPositionShareModalOpen}
      setIsVisible={setIsPositionShareModalOpen}
      label="Share Position"
    >
      <PositionShareCard
        userAffiliateCode={userAffiliateCode}
        positionRef={positionRef}
        position={positionToShare}
        chainId={chainId}
        account={account}
        uploadedImageInfo={uploadedImageInfo}
        uploadedImageError={uploadedImageError}
      />
      {uploadedImageError && <span className="error">{uploadedImageError}</span>}

      <div className="actions">
        <button disabled={!uploadedImageInfo} className="mr-base App-button-option" onClick={handleCopy}>
          <BiCopy className="icon" />
          Copy
        </button>
        <button className="mr-base App-button-option" onClick={handleDownload}>
          <RiFileDownloadLine className="icon" />
          Download
        </button>
        <div className={cx("tweet-link-container", { disabled: !uploadedImageInfo })}>
          <a
            target="_blank"
            className={cx("tweet-link App-button-option", { disabled: !uploadedImageInfo })}
            rel="noreferrer"
            href={tweetLink}
          >
            <FiTwitter className="icon" />
            Tweet
          </a>
        </div>
      </div>
    </Modal>
  );
}

function PositionShareCard({ positionRef, position, userAffiliateCode, uploadedImageInfo, uploadedImageError }) {
  console.log({ uploadedImageError });
  const { code, success } = userAffiliateCode;
  const { deltaAfterFeesPercentageStr, isLong, leverage, indexToken, averagePrice, markPrice } = position;
  const homeURL = getHomeUrl();
  return (
    <div className="relative">
      <div ref={positionRef} className="position-share">
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
          <QRCodeSVG size={25} value={success ? `${homeURL}/#/?ref=${code}` : `${homeURL}`} />
          {success ? (
            <div>
              <p className="label">Referral Code:</p>
              <p className="code">{code}</p>
            </div>
          ) : (
            <div>
              <p className="code">app.gmx.io/#/trade</p>
            </div>
          )}
        </div>
      </div>
      {!uploadedImageInfo && !uploadedImageError && (
        <div className="image-overlay-wrapper">
          <div className="image-overlay">
            <SpinningLoader />
            <p className="loading-text">Generating shareable image...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PositionShare;
