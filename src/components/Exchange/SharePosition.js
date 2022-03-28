import Modal from "../Modal/Modal";
import "./SharePosition.css";

function download(dataurl, filename) {
  const link = document.createElement("a");
  link.href = dataurl;
  link.download = filename;
  link.click();
}

function SharePosition(props) {
  let { isVisible, setIsVisible, title, sharePositionData, positions, positionToShareKey } = props;
  let position = positions.find((p) => p.key === positionToShareKey);
  let imageName = `${position.indexToken.symbol}-${position.isLong ? "long" : "short"}`;
  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
      <div className="share-position-image">
        <img src={sharePositionData} alt="" />
      </div>
      <div className="social-share-btn">
        <button className="default-btn" onClick={() => download(sharePositionData, imageName)}>
          Download to share
        </button>
      </div>
    </Modal>
  );
}

export default SharePosition;
