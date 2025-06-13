import cx from "classnames";
import { FaRegStar, FaStar } from "react-icons/fa";

export default function FavoriteStar({
  isFavorite,
  activeClassName,
}: {
  isFavorite?: boolean;
  activeClassName?: string;
}) {
  return isFavorite ? (
    <FaStar className={cx("text-yellow-300", activeClassName)} />
  ) : (
    <FaRegStar className="text-slate-100" />
  );
}
