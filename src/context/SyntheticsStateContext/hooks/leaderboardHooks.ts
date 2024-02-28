import { selectLeaderboardAccounts } from "../selectors/leaderboardSelectors";
import { useSelector } from "../utils";

export const useLeaderboardAccounts = () => useSelector(selectLeaderboardAccounts);
