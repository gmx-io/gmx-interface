import { t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";

import SearchInput from "components/SearchInput/SearchInput";
import Tab from "components/Tab/Tab";
import {
  useLeaderboardCurrentAccount,
  useLeaderboardRankedAccounts,
} from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { CompetitionType } from "domain/synthetics/leaderboard";
import { LeaderboardAccountsTable } from "./LeaderboardAccountsTable";
import { useAccount } from "context/SyntheticsStateContext/hooks/globalsHooks";

const competitionLabels = [t`Notional PnL`, t`PnL Percentage`];
const competitionsTabs = [0, 1];

export function LeaderboardContainer({ isCompetitions }: { isCompetitions: boolean }) {
  const [search, setSearch] = useState("");
  const accounts = useLeaderboardRankedAccounts();
  const account = useAccount();
  const leaderboardCurrentAccount = useLeaderboardCurrentAccount();
  const isLoading = !accounts;
  const accountsStruct = useMemo(
    () => ({
      isLoading,
      data: accounts ? accounts : [],
      error: null,
      updatedAt: 0,
    }),
    [accounts, isLoading]
  );
  const currentAccountStruct = useMemo(
    () => ({
      isLoading,
      data: leaderboardCurrentAccount ? [leaderboardCurrentAccount] : [],
      error: null,
      updatedAt: 0,
    }),
    [isLoading, leaderboardCurrentAccount]
  );
  const handleKeyDown = useCallback(() => null, []);
  const [activeCompetitionIndex, setActiveCompetitionIndex] = useState(0);
  const activeCompetition: CompetitionType = activeCompetitionIndex === 0 ? "notionalPnl" : "pnlPercentage";

  return (
    <div className="GlobalLeaderboards">
      {account && leaderboardCurrentAccount && (
        <>
          <LeaderboardAccountsTable
            activeCompetition={isCompetitions ? activeCompetition : undefined}
            accounts={currentAccountStruct}
            search=""
            sortingEnabled={false}
            skeletonCount={1}
          />
          <br />
          <br />
        </>
      )}
      {isCompetitions && (
        <Tab
          option={activeCompetitionIndex}
          onChange={(val) => setActiveCompetitionIndex(val)}
          options={competitionsTabs}
          optionLabels={competitionLabels}
        />
      )}
      <div className="LeaderboardHeader">
        <SearchInput
          placeholder={t`Search Address`}
          className={cx("LeaderboardSearch")}
          value={search}
          setValue={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <LeaderboardAccountsTable
        activeCompetition={isCompetitions ? activeCompetition : undefined}
        accounts={accountsStruct}
        search={search}
      />
    </div>
  );
}
