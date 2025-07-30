import cx from "classnames";

import StarIcon from "img/ic_star.svg?react";
import StarFilledIcon from "img/ic_star_filled.svg?react";

export default function FavoriteStar({
  isFavorite,
  activeClassName,
}: {
  isFavorite?: boolean;
  activeClassName?: string;
}) {
  return (
    <div className="flex h-16 w-16 items-center justify-center">
      {isFavorite ? <StarFilledIcon className={cx("text-white", activeClassName)} /> : <StarIcon />}
    </div>
  );
}
