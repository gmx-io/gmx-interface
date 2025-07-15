import cx from "classnames";

import { importImage } from "lib/legacy";

import "./TokenIcon.scss";

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
};

function TokenIcon({ className, symbol, displaySize, importSize = 24, badge }: Props) {
  const iconPath = getIconUrlPath(symbol, importSize);
  const classNames = cx("Token-icon inline rounded-full", className);

  if (!iconPath) return <></>;

  const imageSource = importImage(iconPath);

  let sub;
  const img = (
    <img
      data-qa="token-icon"
      className={classNames}
      src={imageSource}
      alt={symbol}
      width={displaySize}
      height={displaySize}
    />
  );

  if (badge) {
    if (typeof badge === "string") {
      sub = (
        <span className="pointer-events-none absolute -bottom-8 -right-8 z-10 rounded-20 border border-slate-800 bg-slate-500 px-4 py-2 text-12 !text-white">
          {badge}
        </span>
      );
    } else {
      const badge0Path = getIconUrlPath(badge[0], 24);
      const badge1Path = getIconUrlPath(badge[1], 24);

      if (!badge0Path || !badge1Path) {
        return img;
      }

      const badge0Source = importImage(badge0Path);
      const badge1Source = importImage(badge1Path);

      sub = (
        <span className="absolute -bottom-8 -right-8 flex flex-row items-center justify-center !text-white">
          <img
            className="z-20 -mr-10 rounded-[100%] border border-slate-800"
            src={badge0Source || ""}
            alt={badge[0]}
            width={20}
            height={20}
          />
          <img
            className="z-10 rounded-[100%] border border-slate-800"
            src={badge1Source || ""}
            alt={badge[0]}
            width={20}
            height={20}
          />
        </span>
      );
    }
  }

  if (!sub) {
    return img;
  }

  return (
    <span className="relative">
      {img}
      {sub}
    </span>
  );
}

export default TokenIcon;
