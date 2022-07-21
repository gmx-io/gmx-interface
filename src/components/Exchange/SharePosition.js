import Modal from "../Modal/Modal";
import "./SharePosition.css";

function download(dataurl, filename) {
  const link = document.createElement("a");
  link.href = dataurl;
  link.download = filename;
  link.click();
}

function SharePosition(props) {
  let { isVisible, setIsVisible, title, sharePositionImageUri, positionToShare, sharePositionInfo } = props;
  let position = positionToShare;
  let imageName = `${position.indexToken.symbol}-${position.isLong ? "long" : "short"}`;
  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
      <div className="share-position-image">
        <img src={sharePositionInfo.image_url} alt="" />
      </div>
      <div className="social-share-btn">
        <button className="default-btn" onClick={() => download(sharePositionImageUri, imageName)}>
          Download to share
        </button>
        <a
          target="_blank"
          rel="noreferrer"
          href={`https://twitter.com/intent/tweet?text=Latest%20trade%20on%20GMX&url=https://gmxs.vercel.app/api/share%3Fimage_url%3D${sharePositionInfo.image_url}%26ref%3D${sharePositionInfo.ref}`}
          className="default-btn"
        >
          Tweet
        </a>
      </div>
    </Modal>
  );
}

export default SharePosition;
