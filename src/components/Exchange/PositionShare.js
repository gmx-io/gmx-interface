import { useEffect, useRef, useState } from "react";
import { toJpeg } from "html-to-image";
import cx from "classnames";
import { useCopyToClipboard } from "react-use";
import Modal from "../Modal/Modal";
import gmxLogo from "../../img/gmx-logo-with-name.svg";
import "./PositionShare.css";
import { QRCodeCanvas } from "qrcode.react";
import { formatAmount, getAppBaseUrl, getTwitterIntentURL, helperToast, USD_DECIMALS } from "../../Helpers";
import { useAffiliateCodes } from "../../Api/referrals";
import SpinningLoader from "../Common/SpinningLoader";

const UPLOAD_URL = "https://gmxs.vercel.app/api/upload";
const UPLOAD_SHARE = "https://gmxs.vercel.app/api/s";
const config = { quality: 0.95, canvasWidth: 518, canvasHeight: 292 };

function getShareURL(imageInfo, ref) {
  if (!imageInfo) return;
  let url = `${UPLOAD_SHARE}?v=${imageInfo.version}&id=${imageInfo.id}`;
  if (ref.success) {
    url = url + `&ref=${ref.code}`;
  }
  return url;
}

function PositionShare({ setIsPositionShareModalOpen, isPositionShareModalOpen, positionToShare, account, chainId }) {
  const userAffiliateCode = useAffiliateCodes(chainId, account);
  const [uploadedImageInfo, setUploadedImageInfo] = useState();
  const [, copyToClipboard] = useCopyToClipboard();
  const positionRef = useRef();
  const tweetLink = getTwitterIntentURL(
    `Checkout my latest ${positionToShare?.collateralToken?.symbol} trade @GMX_IO`,
    getShareURL(uploadedImageInfo, userAffiliateCode)
  );

  useEffect(() => {
    (async function () {
      const element = positionRef.current;
      if (!element) return;
      const image = await toJpeg(element, config);
      if (userAffiliateCode.success) {
        const imageInfo = await fetch(UPLOAD_URL, { method: "POST", body: image }).then((res) => res.json());
        setUploadedImageInfo(imageInfo);
      }
    })();
  }, [userAffiliateCode]);

  async function handleDownload() {
    const { collateralToken, isLong } = positionToShare;
    const element = positionRef.current;
    if (!element) return;
    const dataUrl = await toJpeg(element, config);
    const link = document.createElement("a");
    link.download = `${collateralToken.symbol}-${isLong ? "long" : "short"}.jpeg`;
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
      label="Launch App"
    >
      <PositionShareCard
        userAffiliateCode={userAffiliateCode}
        positionRef={positionRef}
        position={positionToShare}
        chainId={chainId}
        account={account}
        uploadedImageInfo={uploadedImageInfo}
      />

      <div className="actions">
        <button disabled={!uploadedImageInfo} className="default-btn mr-base" onClick={handleCopy}>
          Copy
        </button>
        <button className="default-btn mr-base" onClick={handleDownload}>
          Download
        </button>
        <a
          target="_blank"
          className={cx("default-btn tweet-link", { disabled: !uploadedImageInfo })}
          rel="noreferrer"
          href={tweetLink}
        >
          Tweet
        </a>
      </div>
    </Modal>
  );
}

function PositionShareCard({ positionRef, position, userAffiliateCode, uploadedImageInfo }) {
  const { code, success } = userAffiliateCode;
  const { deltaAfterFeesPercentageStr, isLong, leverage, indexToken, averagePrice, markPrice } = position;
  const baseUrl = getAppBaseUrl();
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
          <QRCodeCanvas
            includeMargin={true}
            size={25}
            value={success ? `${baseUrl}/trade?ref=${code}` : `${baseUrl}/trade`}
          />
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
      {!uploadedImageInfo && (
        <div className="image-overlay-wrapper">
          <div className="image-overlay">
            <SpinningLoader size={2} />
            <p class="loading-text">Generating shareable image...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PositionShare;
