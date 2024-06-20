import { ReactNode } from "react";
import { getIcon } from "config/icons";
import "./PageTitle.scss";
import { useChainId } from "lib/chains";
import cx from "classnames";

type Props = {
  title: string;
  subtitle?: string | ReactNode;
  className?: string;
  isTop?: boolean;
  showNetworkIcon?: boolean;
  afterTitle?: ReactNode;
  chainId?: number;
};

export default function PageTitle({
  title,
  subtitle,
  className,
  isTop = false,
  showNetworkIcon = true,
  afterTitle,
  chainId,
}: Props) {
  const classNames = cx("Page-title-wrapper", className, { gapTop: !isTop });
  const { chainId: fallbackChainId } = useChainId();
  const currentNetworkIcon = getIcon(chainId ?? fallbackChainId, "network");
  return (
    <div className={classNames}>
      <div className="Page-title-group">
        <h2 className="Page-title__text">{title}</h2>
        {showNetworkIcon && <img className="Page-title__icon" src={currentNetworkIcon} alt="Current Network Icon" />}
        {afterTitle}
      </div>
      <div className="Page-subtitle-group">{subtitle}</div>
    </div>
  );
}
