import { getIconUrlPath } from '@/utils/lib/icon';
import cx from 'classnames';

type Props = {
  symbol: string;
  displaySize: number;
  importSize?: 24 | 40;
  className?: string;
  badge?: string | readonly [topSymbol: string, bottomSymbol: string];
};

function TokenIcon({
  className,
  symbol,
  displaySize,
  importSize = 24,
  badge,
}: Props) {
  const iconPath = getIconUrlPath(symbol, importSize);
  const classNames = cx('inline align-bottom', className);

  if (!iconPath) return <></>;

  let sub;
  const img = (
    <img
      data-qa="token-icon"
      className={classNames}
      src={iconPath}
      alt={symbol}
      width={displaySize}
      height={displaySize}
    />
  );

  if (badge) {
    if (typeof badge === 'string') {
      sub = (
        <span className="rounded-20 text-12 pointer-events-none absolute -bottom-8 -right-8 z-10 border border-slate-800 bg-slate-500 px-4 py-2 !text-white">
          {badge}
        </span>
      );
    } else {
      sub = (
        <span className="absolute -bottom-8 -right-8 flex flex-row items-center justify-center !text-white">
          <img
            className="z-20 -mr-10 rounded-full border border-slate-800"
            src={getIconUrlPath(badge[0], 24)}
            alt={badge[0]}
            width={20}
            height={20}
          />
          <img
            className="z-10 rounded-full border border-slate-800"
            src={getIconUrlPath(badge[1], 24)}
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
