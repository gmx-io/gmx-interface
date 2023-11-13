import { FiX } from "react-icons/fi";

import "./Overlay.css";

export default function Overlay(props) {
  return (
    <div className="Overlay">
      <div className="Overlay-backdrop" />
      <div className="Overlay-content-outer">
        <div className="Overlay-top-bar">
          <div className="Overlay-title">{props.title}</div>
          <div className="Overlay-close-button" onClick={() => props.setIsVisible(false)}>
            <FiX />
          </div>
        </div>
        <div className="Overlay-content">{props.children}</div>
      </div>
    </div>
  );
}
