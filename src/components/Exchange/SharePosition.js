import { useEffect, useRef, useState } from "react";
import domtoimage from "dom-to-image";
import Modal from "../Modal/Modal";
import PositionShareUI from "./PositionShareUI";
import bg from "../../img/bg.jpeg";

function SharePosition(props) {
  let sharePositionRef = useRef(null);
  let [shareImg, setShareImg] = useState();
  useEffect(() => {
    console.log(bg);
    domtoimage
      .toPng(sharePositionRef.current, {
        height: 500,
        width: 600,
        style: {
          backgroundImage: `url(${bg})`,
        },
      })
      .then(function (dataUrl) {
        domtoimage
          .toPng(sharePositionRef.current, {
            height: 500,
            width: 600,
            style: {
              backgroundImage: `url(${bg})`,
            },
          })
          .then((imgData) => {
            var img = new Image();
            img.src = imgData;
            setShareImg(imgData);
            console.log(img);
          });
      })
      .catch(function (error) {
        console.error("oops, something went wrong!", error);
      });
  }, [sharePositionRef]);
  let { isVisible, setIsVisible, title, positions, selectedPositionKey } = props;
  if (!positions || !selectedPositionKey) return "Something went wrong!";
  let selectedPosition = positions.find((p) => p.key === selectedPositionKey);
  console.log(sharePositionRef);
  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
      <div ref={sharePositionRef}>
        <PositionShareUI shareImg={shareImg} position={selectedPosition} />
      </div>
    </Modal>
  );
}

export default SharePosition;
