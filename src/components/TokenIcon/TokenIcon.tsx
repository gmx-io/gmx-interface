import cx from "classnames";

import { AnyChainId } from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { findImage } from "lib/legacy";

import "./TokenIcon.scss";

function getIconUrl(symbol: string) {
  if (!symbol) return;

  return findImage(`ic_${symbol.toLowerCase()}.svg`);
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
  const iconUrl = getIconUrl(symbol);
  const classNames = cx("Token-icon inline rounded-full", className);

  if (!iconUrl) return <></>;

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
      const [topIconUrl, bottomIconUrl] = [getIconUrl(badge[0]), getIconUrl(badge[1])];
      sub = (
        <span
          className={cx(
            "absolute -bottom-8 -right-8 flex flex-row items-center justify-center text-typography-secondary",
            badgeClassName
          )}
        >
          {topIconUrl ? (
            <img
              className="z-20 -mr-10 rounded-[100%] border-2 border-slate-900 bg-slate-900"
              src={topIconUrl}
              alt={badge[0]}
              width={20}
              height={20}
            />
          ) : null}
          {bottomIconUrl ? (
            <img
              className="z-10 rounded-[100%] border-2 border-slate-900 bg-slate-900"
              src={bottomIconUrl}
              alt={badge[0]}
              width={20}
              height={20}
            />
          ) : null}
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
        src={CHAIN_ID_TO_NETWORK_ICON[chainIdBadge as AnyChainId]}
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
      src={iconUrl}
      // TODO Remove alt as it shows during loading
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
