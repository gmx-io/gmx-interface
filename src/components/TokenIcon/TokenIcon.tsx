import { importImage } from "lib/legacy";
import cx from "classnames";
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
  const classNames = cx("Token-icon inline", className);

  if (!iconPath) return <></>;

  let sub;
  const img = (
    <img
      data-qa="token-icon"
      className={classNames}
      src={importImage(iconPath)}
      alt={symbol}
      width={displaySize}
      height={displaySize}
    />
  );

  if (badge) {
    if (typeof badge === "string") {
      sub = (
        <span className="z-3 absolute -bottom-8 -right-8 rounded-20 border-1 border-slate-800 bg-slate-500 px-4 py-2 text-12 !text-white">
          {badge}
        </span>
      );
    } else {
      sub = (
        <span className="absolute -bottom-8 -right-8 flex flex-row items-center justify-center !text-white">
          <img
            className="z-30 -mr-10 rounded-[100%] border-1 border-slate-800"
            src={importImage(getIconUrlPath(badge[0], 24))}
            alt={badge[0]}
            width={20}
            height={20}
          />
          <img
            className="z-20 rounded-[100%] border-1 border-slate-800"
            src={importImage(getIconUrlPath(badge[1], 24))}
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
