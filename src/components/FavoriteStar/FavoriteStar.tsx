import { FaRegStar, FaStar } from "react-icons/fa";

export default function FavoriteStar({ isFavorite }: { isFavorite?: boolean }) {
  return isFavorite ? <FaStar className="text-gray-400" /> : <FaRegStar className="text-gray-400" />;
}
