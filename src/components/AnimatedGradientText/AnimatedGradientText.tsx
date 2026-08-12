import cx from "classnames";

import "./AnimatedGradientText.scss";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function AnimatedGradientText({ children, className }: Props) {
  return <span className={cx("animated-gradient-text", className)}>{children}</span>;
}
