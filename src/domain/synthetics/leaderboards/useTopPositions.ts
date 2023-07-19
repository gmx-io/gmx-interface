import { PositionScores, RemoteData } from "./types";

export function useTopPositions(): RemoteData<PositionScores> {
  return { isLoading: false, data: [], error: null };
}
