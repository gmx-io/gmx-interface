import "./SpinningLoader.css";

import { ImSpinner2 } from "react-icons/im";

function SpinningLoader({ size = "1.25rem" }) {
  return <ImSpinner2 className="spin spinning-loader" style={{ fontSize: size }} />;
}

export default SpinningLoader;
