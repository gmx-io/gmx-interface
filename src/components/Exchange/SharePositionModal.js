import { useRef, useState } from "react";
import { toPng, toBlob } from "html-to-image";
import Modal from "../Modal/Modal";
import gmxLogo from "../../img/gmx-logo-with-name.svg";
import "./PositionShare.css";
import { QRCodeCanvas } from "qrcode.react";
import { formatAmount, USD_DECIMALS } from "../../Helpers";
import { useAffiliateCodes } from "../../Api/referrals";

const config = { canvasWidth: 1200, canvasHeight: 675 };

function generateTweetLink(referralCode = "") {
  return `https://twitter.com/intent/tweet?text=Checkout%20my%20ETH%20position%20on%20%40GMX_IO!%0A%0A%20Use%20my%20link%20to%20trade%20https%3A%2F%2Fapp.gmx.io%2Ftrade${
    referralCode ? `%3Fref%3D${referralCode}` : ""
  }.%0A%0A%20%5Bpaste%20image%20you%20copied%20or%20delete%20this%5D`;
}

function SharePositionModal({
  setIsPositionShareModalOpen,
  isPositionShareModalOpen,
  positionToShare,
  account,
  chainId,
}) {
  const [copyText, setCopyText] = useState("Copy");
  const codes = useAffiliateCodes(chainId, account);
  const positionRef = useRef();
  async function handleCopy() {
    const element = positionRef.current;
    if (!element) return;
    const blob = await toBlob(element, config);
    try {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      setCopyText("Copied!");
      setTimeout(() => {
        setCopyText("Copy");
      }, 5000);
    } catch {
      setCopyText("Something went wrong!");
    }
  }
  async function handleDownload() {
    const element = positionRef.current;
    if (!element) return;
    const dataUrl = await toPng(element, { quality: 0.75 });
    const link = document.createElement("a");
    link.download = `long-${Math.random() * 100000}.jpeg`;
    link.href = dataUrl;
    window.linkA = link;
    document.body.appendChild(link);
    link.click();
  }
  if (!positionToShare) return "Loading...";
  return (
    <Modal
      className="position-share-modal"
      isVisible={isPositionShareModalOpen}
      setIsVisible={setIsPositionShareModalOpen}
      label="Launch App"
    >
      <PositionShareCard
        codes={codes}
        positionRef={positionRef}
        position={positionToShare}
        chainId={chainId}
        account={account}
      />
      <div className="actions">
        {copyText === "Copied!" ? (
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="default-btn"
            href={generateTweetLink(codes.length > 0 && codes[0])}
          >
            Share on Twitter
          </a>
        ) : (
          <button className="default-btn" onClick={handleCopy}>
            {copyText}
          </button>
        )}
        <button className="default-btn" onClick={handleDownload}>
          Download
        </button>
      </div>
    </Modal>
  );
}

function PositionShareCard({ positionRef, position, codes }) {
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
          size={35}
          level="M"
          value={codes.length > 0 ? `https://gmx.io/trade?ref=${codes[0]}` : "https://gmx.io/trade"}
        />
        {codes.length > 0 ? (
          <div>
            <p className="label">Referral Code:</p>
            <p className="code">{codes?.[0]}</p>
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

export default SharePositionModal;
