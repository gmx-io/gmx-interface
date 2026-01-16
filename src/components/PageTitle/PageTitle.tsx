import cx from "classnames";
import type { ReactNode } from "react";

import "./PageTitle.scss";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  isTop?: boolean;
  afterTitle?: ReactNode;
  qa?: string;
};

export default function PageTitle({ title, subtitle, className, isTop = false, afterTitle, qa }: Props) {
  const classNames = cx("Page-title-wrapper", className, { gapTop: !isTop });
  return (
    <div className={classNames} data-qa={qa}>
      <div className="Page-title-group">
        <h2 className="Page-title__text text-h1">{title}</h2>
        {afterTitle}
      </div>
      <div className="text-body-medium font-medium text-typography-secondary">{subtitle}</div>
    </div>
  );
}
