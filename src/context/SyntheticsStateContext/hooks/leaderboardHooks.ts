import {
  selectLeaderboardRankedAccounts,
  selectLeaderboardAccountsRanks,
  selectLeaderboardCurrentAccount,
  selectLeaderboardType,
  selectLeaderboardSetType,
} from "../selectors/leaderboardSelectors";
import { useSelector } from "../utils";

export const useLeaderboardRankedAccounts = () => useSelector(selectLeaderboardRankedAccounts);
export const useLeaderboardAccountsRanks = () => useSelector(selectLeaderboardAccountsRanks);
export const useLeaderboardCurrentAccount = () => useSelector(selectLeaderboardCurrentAccount);

export const useLeaderboardTypeState = () => {
  return [useSelector(selectLeaderboardType), useSelector(selectLeaderboardSetType)] as const;
};
