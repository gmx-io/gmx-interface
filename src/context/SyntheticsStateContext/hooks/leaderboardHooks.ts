import {
  selectLeaderboardRankedAccounts,
  selectLeaderboardAccountsRanks,
  selectLeaderboardCurrentAccount,
} from "../selectors/leaderboardSelectors";
import { useSelector } from "../utils";

export const useLeaderboardRankedAccounts = () => useSelector(selectLeaderboardRankedAccounts);
export const useLeaderboardAccountsRanks = () => useSelector(selectLeaderboardAccountsRanks);
export const useLeaderboardCurrentAccount = () => useSelector(selectLeaderboardCurrentAccount);
