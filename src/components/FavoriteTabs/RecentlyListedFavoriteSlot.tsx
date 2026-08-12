import cx from "classnames";

import FavoriteStar from "components/FavoriteStar/FavoriteStar";

import { RecentlyListedBadge } from "./RecentlyListedBadge";

type Props = {
  isRecentlyListed: boolean;
  isFavorite: boolean | undefined;
  starClassName?: string;
};

export function RecentlyListedFavoriteSlot({ isRecentlyListed, isFavorite, starClassName }: Props) {
  if (!isRecentlyListed) {
    return <FavoriteStar isFavorite={isFavorite} className={starClassName} />;
  }

  return (
    <span className="relative inline-flex h-16 min-w-32 items-center justify-center">
      <RecentlyListedBadge className="transition-opacity group-hover/row:opacity-0 group-hover/tr:opacity-0" />
      <FavoriteStar
        isFavorite={isFavorite}
        className={cx(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/row:opacity-100 group-hover/tr:opacity-100",
          starClassName
        )}
      />
    </span>
  );
}
