import cx from "classnames";
import { ButtonHTMLAttributes } from "react";

import "./EmbeddedActionButton.scss";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">;

export function EmbeddedActionButton({ children, className, ...rest }: Props) {
  return (
    <button type="button" className={cx("EmbeddedActionButton", className)} {...rest}>
      {children}
    </button>
  );
}
