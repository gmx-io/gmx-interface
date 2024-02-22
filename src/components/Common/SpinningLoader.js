import "./SpinningLoader.css";

import { ImSpinner2 } from "react-icons/im";
import { useMemo } from "react";

function SpinningLoader({ size = "1.25rem" }) {
  const style = useMemo(() => ({ fontSize: size }), [size]);
  return <ImSpinner2 className="spin spinning-loader" style={style} />;
}

export default SpinningLoader;
