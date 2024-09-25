import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { useMissedCoinsSearch } from "domain/synthetics/userFeedback/useMissedCoinsSearch";

export function WithMissedCoinsSearch({
  searchKeyword,
  isEmpty,
  place,
  skip,
}: {
  searchKeyword: string;
  isEmpty: boolean;
  place?: MissedCoinsPlace;
  skip?: boolean;
}) {
  useMissedCoinsSearch({
    searchText: searchKeyword,
    isEmpty,
    place,
    skip,
  });
  return null;
}
