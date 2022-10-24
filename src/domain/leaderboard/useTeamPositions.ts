import { useState } from "react";

export type Position = {};

export function useTeamPositions(chainId, leaderAddress) {
  const [data] = useState<Position[]>([]);
  const [loading] = useState(true);

  return { data, loading };
}
