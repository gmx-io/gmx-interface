import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { useMissedCoinsSearch } from "domain/synthetics/userFeedback/useMissedCoinsSearch";

export function WithMissedCoinsSearch({
  searchKeyword,
  isEmpty,
  isLoaded,
  place,
  skip,
}: {
  searchKeyword: string;
  isEmpty: boolean;
  isLoaded: boolean;
  place?: MissedCoinsPlace;
  skip?: boolean;
}) {
  useMissedCoinsSearch({
    searchText: searchKeyword,
    isEmpty,
    isLoaded,
    place,
    skip,
  });
  return null;
}
