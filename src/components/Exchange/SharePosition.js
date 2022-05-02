import Modal from "../Modal/Modal";
import "./SharePosition.css";

function download(dataurl, filename) {
  const link = document.createElement("a");
  link.href = dataurl;
  link.download = filename;
  link.click();
}

function SharePosition(props) {
  let { isVisible, setIsVisible, title, sharePositionImageUri, positionToShare } = props;
  let position = positionToShare;
  let imageName = `${position.indexToken.symbol}-${position.isLong ? "long" : "short"}`;
  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
      <div className="share-position-image">
        <img src={sharePositionImageUri} alt="" />
      </div>
      <div className="social-share-btn">
        <button className="default-btn" onClick={() => download(sharePositionImageUri, imageName)}>
          Download to share
        </button>
      </div>
    </Modal>
  );
}

export default SharePosition;
