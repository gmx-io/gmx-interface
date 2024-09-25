import {
  selectAccountStats,
  selectLastMonthAccountStats,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useEffect } from "react";
import { sendMissedCoinSearchDebounced } from "./requests";
import { MissedCoinsPlace } from "./types";

export function useMissedCoinsSearch({
  searchText,
  isEmpty,
  place,
  skip,
}: {
  searchText: string;
  isEmpty: boolean;
  place?: MissedCoinsPlace;
  skip?: boolean;
}) {
  const lastMonthAccountStats = useSelector(selectLastMonthAccountStats);
  const accountStats = useSelector(selectAccountStats);

  useEffect(() => {
    if (!skip && searchText.length > 2 && isEmpty && place) {
      sendMissedCoinSearchDebounced({
        searchText,
        totalVolume: accountStats?.volume,
        monthVolume: lastMonthAccountStats?.volume,
        place,
      });
    }
  }, [accountStats?.volume, isEmpty, lastMonthAccountStats?.volume, place, searchText, skip]);
}
