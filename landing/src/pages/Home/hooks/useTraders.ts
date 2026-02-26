import { ARBITRUM, AVALANCHE, BOTANIX, MEGAETH } from "config/chains";
import useUniqueUsers from "domain/stats/useUniqueUsers";
import useUsers from "domain/synthetics/stats/useUsers";
import { sumBigInts } from "lib/sumBigInts";

export function useTraders(): number | null {
  const uniqueUsers = useUniqueUsers();
  const arbitrumUsers = useUsers(ARBITRUM);
  const avalancheUsers = useUsers(AVALANCHE);
  const botanixUsers = useUsers(BOTANIX);
  const megaethUsers = useUsers(MEGAETH);
  return Number(
    sumBigInts(
      uniqueUsers?.[ARBITRUM],
      uniqueUsers?.[AVALANCHE],
      uniqueUsers?.[BOTANIX],
      uniqueUsers?.[MEGAETH],
      arbitrumUsers?.totalUsers,
      avalancheUsers?.totalUsers,
      botanixUsers?.totalUsers,
      megaethUsers?.totalUsers
    )
  );
}
