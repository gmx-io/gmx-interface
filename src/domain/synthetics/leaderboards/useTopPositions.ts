import { PositionScores, RemoteData } from "./types";
import { usePositionScores } from "./usePositionScores";

export function useTopPositions(): RemoteData<PositionScores> {
  const { isLoading, data, error } = usePositionScores();
  const orderedData = [...data].sort((a, b) => (
    a.unrealizedPnl.gt(b.unrealizedPnl) ? -1 : 1
  ));
  return { isLoading, error, data: orderedData };
}
