import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import cx from "classnames";
import { useCopyToClipboard } from "react-use";
import Modal from "../Modal/Modal";
import gmxLogo from "../../img/gmx-logo-with-name.svg";
import "./PositionShare.css";
import { QRCodeCanvas } from "qrcode.react";
import { formatAmount, USD_DECIMALS } from "../../Helpers";
import { useAffiliateCodes } from "../../Api/referrals";
import SpinningLoader from "../Common/SpinningLoader";

const UPLOAD_URL = "https://gmxs.vercel.app/api/upload";
const config = { quality: 0.5 };

function getShareURL(imageInfo, ref) {
  if (!imageInfo) return;
  let url = `https://gmxs.vercel.app/api/s?v=${imageInfo.version}&id=${imageInfo.id}`;
  if (ref.success) {
    url = url + `&ref=${ref.code}`;
  }
  return url;
}

function PositionShare({ setIsPositionShareModalOpen, isPositionShareModalOpen, positionToShare, account, chainId }) {
  const userAffiliateCode = useAffiliateCodes(chainId, account);
  const [copyText, setCopyText] = useState("Copy");
  const [uploadedImageInfo, setUploadedImageInfo] = useState();
  const [copyState, copyToClipboard] = useCopyToClipboard();
  const positionRef = useRef();

  useEffect(() => {
    (async function () {
      const element = positionRef.current;
      if (!element) return;
      const imagePng = await toPng(element);
      if (userAffiliateCode.success) {
        const imageInfo = await fetch(UPLOAD_URL, { method: "POST", body: imagePng }).then((res) => res.json());
        setUploadedImageInfo(imageInfo);
      }
    })();
  }, [userAffiliateCode]);

  useEffect(() => {
    if (copyState.value) {
      setCopyText("Copied");
      setTimeout(() => {
        setCopyText("Copy");
      }, 5000);
    }
    if (copyState.error) {
      setCopyText("Unable to copy");
    }
  }, [copyState]);

  async function handleDownload() {
    const element = positionRef.current;
    if (!element) return;
    const dataUrl = await toPng(element, config);
    const link = document.createElement("a");
    link.download = `long-${Math.random() * 100000}.jpeg`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
  }

  function handleCopy() {
    if (!uploadedImageInfo) return;
    const url = getShareURL(uploadedImageInfo, userAffiliateCode);
    copyToClipboard(url);
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
      />
      {!uploadedImageInfo && (
        <div className="image-loading">
          <SpinningLoader />
          <p>Generating shareable image..</p>
        </div>
      )}
      <div className="actions">
        <button disabled={!uploadedImageInfo} className="default-btn mr-base" onClick={handleCopy}>
          {copyText}
        </button>
        <button className="default-btn mr-base" onClick={handleDownload}>
          Download
        </button>
        <a
          target="_blank"
          className={cx("default-btn tweet-link", { disabled: !uploadedImageInfo })}
          rel="noreferrer"
          href={getShareURL(uploadedImageInfo, userAffiliateCode)}
        >
          Tweet
        </a>
      </div>
    </Modal>
  );
}

function PositionShareCard({ positionRef, position, userAffiliateCode }) {
  const { code, success } = userAffiliateCode;
  const { deltaAfterFeesPercentageStr, isLong, leverage, indexToken, averagePrice, markPrice } = position;
  return (
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
          size={20}
          level="M"
          value={success ? `https://gmx.io/trade?ref=${code}` : "https://gmx.io/trade"}
        />
        {success ? (
          <div>
            <p className="label">Referral Code:</p>
            <p className="code">{code}</p>
          </div>
        ) : (
          <div>
            <p className="code">app.gmx.io/trade</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PositionShare;
