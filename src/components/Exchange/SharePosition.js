import { useState } from "react";
import cx from "classnames";
import { useCopyToClipboard } from "react-use";
import SpinningLoader from "../Common/SpinningLoader";
import Modal from "../Modal/Modal";
import "./SharePosition.css";
import { getTwitterIntentURL } from "../../Helpers";
import { useEffect } from "react";

function download(dataurl, filename) {
  const link = document.createElement("a");
  link.href = dataurl;
  link.download = filename;
  link.click();
}

function getTweetLink(info, trade) {
  if (!info || !trade) return "";
  const text = `Checkout my latest ${trade.indexToken.symbol} trade on @gmx_io`;
  const url = `https://gmxs.vercel.app/api/s?v=${info?.version}&id=${info?.id.split("/")[1]}&ref=${info?.ref}`;
  return getTwitterIntentURL(text, url);
}

function SharePosition(props) {
  const { isVisible, setIsVisible, title, positionToShare, sharePositionInfo } = props;
  const [isLoaded, setIsLoaded] = useState(false);
  const [copyText, setCopyText] = useState("Copy");
  const [copyState, copyToClipboard] = useCopyToClipboard();

  let { indexToken, isLong } = positionToShare;
  let imageName = `${indexToken.symbol}-${isLong ? "long" : "short"}`;

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

  function handleCopy() {
    if (!sharePositionInfo) return;
    const url = `https://gmxs.vercel.app/api/s?v=${sharePositionInfo?.version}&id=${
      sharePositionInfo?.id.split("/")[1]
    }&ref=${sharePositionInfo?.ref}`;
    copyToClipboard(url);
  }

  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
      {sharePositionInfo && (
        <div className={cx("share-position-image", { loaded: isLoaded })}>
          <img onLoad={() => setIsLoaded(true)} src={sharePositionInfo.image} alt="" />
        </div>
      )}
      {!isLoaded && (
        <div className="share-img-loading">
          <div className="share-img-loading">
            <SpinningLoader size={4} />
          </div>
        </div>
      )}
      <div className="social-share-btn">
        <button disabled={!isLoaded} className="default-btn mr-base" onClick={handleCopy}>
          {copyText}
        </button>
        <button
          disabled={!isLoaded}
          className="default-btn mr-base"
          onClick={() => download(sharePositionInfo?.image, imageName)}
        >
          Download
        </button>
        <span className="pointer-none">
          <a
            target="_blank"
            className={cx("default-btn tweet-link", { disabled: !isLoaded })}
            rel="noreferrer"
            href={isLoaded ? getTweetLink(sharePositionInfo, positionToShare) : ""}
            disabled={!isLoaded}
          >
            Tweet
          </a>
        </span>
      </div>
    </Modal>
  );
}

export default SharePosition;
