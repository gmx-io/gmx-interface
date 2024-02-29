import { selectLeaderboardAccounts, selectLeaderboardAccountsRanks } from "../selectors/leaderboardSelectors";
import { useSelector } from "../utils";

export const useLeaderboardAccounts = () => useSelector(selectLeaderboardAccounts);
export const useLeaderboardAccountsRanks = () => useSelector(selectLeaderboardAccountsRanks);
