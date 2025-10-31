import cx from "classnames";

import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { importImage } from "lib/legacy";

import "./TokenIcon.scss";

function getIconUrlPath(symbol) {
  if (!symbol) return;

  return `ic_${symbol.toLowerCase()}.svg`;
}

type Props = {
  symbol: string;
  displaySize: number;
  className?: string;
  badge?: string | readonly [topSymbol: string, bottomSymbol: string];
  chainIdBadge?: number;
  badgeClassName?: string;
};

function TokenIcon({ className, symbol, displaySize, badge, badgeClassName, chainIdBadge }: Props) {
  const iconPath = getIconUrlPath(symbol);
  const classNames = cx("Token-icon inline rounded-full", className);

  if (!iconPath) return <></>;

  let sub;
  let containerClassName = "";

  if (badge) {
    if (typeof badge === "string") {
      sub = (
        <span
          className={cx(
            "pointer-events-none absolute -bottom-8 -right-8 z-10 rounded-20 bg-slate-700 px-6 py-2 text-12 font-medium text-typography-secondary",
            badgeClassName
          )}
        >
          {badge}
        </span>
      );
    } else {
      sub = (
        <span
          className={cx(
            "absolute -bottom-8 -right-8 flex flex-row items-center justify-center text-typography-secondary",
            badgeClassName
          )}
        >
          <img
            className="z-20 -mr-10 rounded-[100%] border-2 border-slate-900 bg-slate-900"
            src={importImage(getIconUrlPath(badge[0]))}
            alt={badge[0]}
            width={20}
            height={20}
          />
          <img
            className="z-10 rounded-[100%] border-2 border-slate-900 bg-slate-900"
            src={importImage(getIconUrlPath(badge[1]))}
            alt={badge[0]}
            width={20}
            height={20}
          />
        </span>
      );
    }
  } else if (chainIdBadge !== undefined) {
    let size: number;
    let offset: string;

    if (displaySize >= 40) {
      size = 16;
      offset = "-bottom-0 -right-4";
      containerClassName = "token-icon-with-badge-large";
    } else {
      size = 10;
      offset = "-bottom-2 -right-2";
      containerClassName = "token-icon-with-badge-small";
    }
    sub = (
      <img
        src={CHAIN_ID_TO_NETWORK_ICON[chainIdBadge]}
        width={size}
        height={size}
        className={cx("absolute z-10 box-content rounded-full bg-slate-900", offset)}
      />
    );
  }

  const img = (
    <img
      data-qa="token-icon"
      className={sub ? containerClassName : classNames}
      src={importImage(iconPath)}
      alt={symbol}
      width={displaySize}
      height={displaySize}
    />
  );

  if (!sub) {
    return img;
  }

  return (
    <span className={cx("relative shrink-0", className)}>
      {img}
      {sub}
    </span>
  );
}

export default TokenIcon;
