import { ReactNode } from "react";

import { getIcon } from "config/icons";
import "./PageTitle.scss";
import { useChainId } from "lib/chains";

import cx from "classnames";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  isTop?: boolean;
  showNetworkIcon?: boolean;
  afterTitle?: ReactNode;
  chainId?: number;
  qa?: string;
};

export default function PageTitle({
  title,
  subtitle,
  className,
  isTop = false,
  showNetworkIcon = true,
  afterTitle,
  chainId,
  qa,
}: Props) {
  const classNames = cx("Page-title-wrapper", className, { gapTop: !isTop });
  const { chainId: fallbackChainId } = useChainId();
  const currentNetworkIcon = getIcon(chainId ?? fallbackChainId, "network");
  return (
    <div className={classNames} data-qa={qa}>
      <div className="Page-title-group">
        <h2 className="Page-title__text text-h1">{title}</h2>
        {showNetworkIcon && <img className="Page-title__icon" src={currentNetworkIcon} alt="Current Network Icon" />}
        {afterTitle}
      </div>
      <div className="text-body-medium text-slate-100">{subtitle}</div>
    </div>
  );
}
