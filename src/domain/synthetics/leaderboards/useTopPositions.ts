import { AccountOpenPosition, RemoteData } from "./types";
import { useAccountOpenPositions } from ".";

export function useTopPositions(): RemoteData<AccountOpenPosition> {
  return useAccountOpenPositions();
}
