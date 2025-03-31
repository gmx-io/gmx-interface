import "./SpinningLoader.css";

import cx from "classnames";
import { useMemo } from "react";
import { ImSpinner2 } from "react-icons/im";

interface Props {
  size?: string;
  className?: string;
}

function SpinningLoader({ size = "1.25rem", className }: Props) {
  const style = useMemo(() => ({ fontSize: size }), [size]);
  return <ImSpinner2 className={cx("spin spinning-loader", className)} style={style} />;
}

export default SpinningLoader;
