import cx from "classnames";
import { FaRegStar, FaStar } from "react-icons/fa";

export default function FavoriteStar({
  isFavorite,
  activeClassName,
}: {
  isFavorite?: boolean;
  activeClassName?: string;
}) {
  return (
    <div className="flex h-16 w-16 items-center justify-center">
      {isFavorite ? (
        <FaStar className={cx("text-yellow-300", activeClassName)} />
      ) : (
        <FaRegStar className="text-slate-100" />
      )}
    </div>
  );
}
