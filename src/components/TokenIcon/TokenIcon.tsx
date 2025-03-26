import { importImage } from "lib/legacy";
import cx from "classnames";
import "./TokenIcon.scss";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";

function getIconUrlPath(symbol, size: 24 | 40) {
  if (!symbol || !size) return;
  return `ic_${symbol.toLowerCase()}_${size}.svg`;
}

type Props = {
  symbol: string;
  displaySize: number;
  importSize?: 24 | 40;
  className?: string;
  badge?: string | readonly [topSymbol: string, bottomSymbol: string];
  chainIdBadge?: number;
};

function TokenIcon({ className, symbol, displaySize, importSize = 24, badge, chainIdBadge }: Props) {
  const iconPath = getIconUrlPath(symbol, importSize);
  const classNames = cx("Token-icon inline", className);

  if (!iconPath) return <></>;

  let sub;

  if (badge) {
    if (typeof badge === "string") {
      sub = (
        <span className="pointer-events-none absolute -bottom-8 -right-8 z-10 rounded-20 border border-slate-800 bg-slate-500 px-4 py-2 text-12 !text-white">
          {badge}
        </span>
      );
    } else {
      sub = (
        <span className="absolute -bottom-8 -right-8 flex flex-row items-center justify-center !text-white">
          <img
            className="z-20 -mr-10 rounded-[100%] border border-slate-800"
            src={importImage(getIconUrlPath(badge[0], 24))}
            alt={badge[0]}
            width={20}
            height={20}
          />
          <img
            className="z-10 rounded-[100%] border border-slate-800"
            src={importImage(getIconUrlPath(badge[1], 24))}
            alt={badge[0]}
            width={20}
            height={20}
          />
        </span>
      );
    }
  } else if (chainIdBadge !== undefined) {
    let size = 22;
    let offset = "-bottom-1 -right-1";
    if (displaySize >= 40) {
      size = 22;
      offset = "-bottom-1 -right-1";
    } else if (displaySize === 20) {
      size = 14;
      offset = "-bottom-3 -right-3";
    } else {
      size = displaySize / 2 + 2;
      offset = "-bottom-3 -right-3";
    }
    sub = (
      <img
        src={CHAIN_ID_TO_NETWORK_ICON[chainIdBadge]}
        width={size}
        height={size}
        className={cx("absolute z-10 rounded-full border border-slate-800 bg-slate-800", offset)}
      />
    );
  }

  const img = (
    <img
      data-qa="token-icon"
      className={sub ? "" : classNames}
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
    <span className={cx("relative", className)}>
      {img}
      {sub}
    </span>
  );
}

export default TokenIcon;
