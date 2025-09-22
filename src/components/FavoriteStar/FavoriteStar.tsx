import cx from "classnames";

import StarIcon from "img/ic_star.svg?react";
import StarFilledIcon from "img/ic_star_filled.svg?react";

export default function FavoriteStar({ isFavorite, className }: { isFavorite?: boolean; className?: string }) {
  return (
    <div className={cx("flex h-16 w-16 items-center justify-center [&>svg]:w-full", className)}>
      {isFavorite ? <StarFilledIcon className="text-yellow-300" /> : <StarIcon />}
    </div>
  );
}
