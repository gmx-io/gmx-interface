import { useRef } from "react";
import html2canvas from "html2canvas";
import Modal from "../Modal/Modal";
import "./PositionShare.css";

function SharePositionModal({ setIsPositionShareModalOpen, isPositionShareModalOpen }) {
  const positionRef = useRef();
  async function handleCopy() {
    const element = positionRef.current;
    const canvas = await html2canvas(element);
    canvas.toBlob(function (blob) {
      const item = new window.ClipboardItem({ "image/png": blob });
      navigator.clipboard.write([item]);
    });
  }
  async function handleDownload() {
    const element = positionRef.current;
    const canvas = await html2canvas(element);

    const data = canvas.toDataURL("image/jpg");
    const link = document.createElement("a");
    console.log({ element, data, link, canvas });

    if (typeof link.download === "string") {
      link.href = data;
      link.download = "image.jpg";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(data);
    }
  }
  return (
    <div className="position-share">
      <Modal
        className="RedirectModal"
        isVisible={isPositionShareModalOpen}
        setIsVisible={setIsPositionShareModalOpen}
        label="Launch App"
      >
        <PositionShareCard positionRef={positionRef} />
        <div>
          <button onClick={handleCopy}>Copy</button>
          <button onClick={handleDownload}>Download</button>
        </div>
      </Modal>
    </div>
  );
}

function PositionShareCard({ positionRef }) {
  return (
    <div ref={positionRef} className="position-share-img">
      <h1>Hello World!</h1>
    </div>
  );
}

export default SharePositionModal;
