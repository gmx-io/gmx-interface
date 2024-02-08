import { selectPositionSeller } from "../selectors/positionSellerSelectors";
import { useSelector } from "../utils";

export const usePositionSeller = () => useSelector(selectPositionSeller);
