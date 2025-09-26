import "./SpinningLoader.css";

import cx from "classnames";
import { useMemo } from "react";

import SpinnerIcon from "img/ic_spinner.svg?react";

interface Props {
  size?: string;
  className?: string;
}

function SpinningLoader({ size = "1.25rem", className }: Props) {
  const style = useMemo(() => ({ fontSize: size }), [size]);
  return <SpinnerIcon className={cx("spin spinning-loader", className)} style={style} />;
}

export default SpinningLoader;
