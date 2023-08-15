import { AccountOpenPosition, RemoteData } from "./types";
import { useAccountOpenPositions } from ".";

export function useTopPositions(): RemoteData<AccountOpenPosition> {
  const { isLoading, data, error } = useAccountOpenPositions();
  const orderedData = [...data].sort((a, b) => (
    a.unrealizedPnl.gt(b.unrealizedPnl) ? -1 : 1
  ));
  return { isLoading, error, data: orderedData };
}
