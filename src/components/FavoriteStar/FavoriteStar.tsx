import { FaRegStar, FaStar } from "react-icons/fa";

export default function FavoriteStar({ isFavorite }: { isFavorite?: boolean }) {
  return isFavorite ? <FaStar className="text-yellow-300" /> : <FaRegStar className="text-slate-100" />;
}
