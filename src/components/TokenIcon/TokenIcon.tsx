import cx from "classnames";

import { BOTANIX } from "config/chains";
import { useChainId } from "lib/chains";
import { importImage } from "lib/legacy";

import "./TokenIcon.scss";

function getIconUrlPath(symbol, size: 24 | 40, chainId: number) {
  if (!symbol || !size) return;

  if (symbol === "BTC" && chainId === BOTANIX) {
    return `ic_bbtc_${size}.svg`;
  }

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
  const { chainId } = useChainId();
  const iconPath = getIconUrlPath(symbol, importSize, chainId);
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
        <span className="pointer-events-none absolute -bottom-8 -right-8 z-10 rounded-20 border border-slate-800 bg-slate-500 px-4 py-2 text-12 !text-white">
          {badge}
        </span>
      );
    } else {
      sub = (
        <span className="absolute -bottom-8 -right-8 flex flex-row items-center justify-center !text-white">
          <img
            className="z-20 -mr-10 rounded-[100%] border border-slate-800"
            src={importImage(getIconUrlPath(badge[0], 24, chainId))}
            alt={badge[0]}
            width={20}
            height={20}
          />
          <img
            className="z-10 rounded-[100%] border border-slate-800"
            src={importImage(getIconUrlPath(badge[1], 24, chainId))}
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
