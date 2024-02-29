import "./SpinningLoader.css";

import cx from "classnames";

import { ImSpinner2 } from "react-icons/im";
import { useMemo } from "react";

interface Props {
  size?: string;
  className?: string;
}

function SpinningLoader({ size = "1.25rem", className }: Props) {
  const style = useMemo(() => ({ fontSize: size }), [size]);
  return <ImSpinner2 className={cx("spin spinning-loader", className)} style={style} />;
}

export default SpinningLoader;
