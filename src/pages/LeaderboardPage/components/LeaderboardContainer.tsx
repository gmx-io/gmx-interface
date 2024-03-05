import { t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";

import SearchInput from "components/SearchInput/SearchInput";
import Tab from "components/Tab/Tab";
import {
  useLeaderboardCurrentAccount,
  useLeaderboardRankedAccounts,
  useLeaderboardTypeState,
} from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { CompetitionType } from "domain/synthetics/leaderboard";
import { LeaderboardAccountsTable } from "./LeaderboardAccountsTable";
import { useAccount } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { CompetitionPrizes } from "./CompetitionPrizes";
import { CompetitionCountdown } from "./CompetitionCountdown";
import { LeaderboardNavigation } from "./LeaderboardNavigation";

const competitionLabels = [t`Notional PnL`, t`PnL Percentage`];
const competitionsTabs = [0, 1];

const leaderboardLabels = [t`Total`, t`Last 30 days`, t`Last 7 days`];
const leaderboardTabs = [0, 1, 2];

export function LeaderboardContainer({ isCompetitions }: { isCompetitions: boolean }) {
  const [search, setSearch] = useState("");
  const [activeLeaderboardIndex, setActiveLeaderboardIndex] = useState(0);
  const [activeCompetitionIndex, setActiveCompetitionIndex] = useState(0);
  const [, setLeaderboardType] = useLeaderboardTypeState();
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

  const activeCompetition: CompetitionType = activeCompetitionIndex === 0 ? "notionalPnl" : "pnlPercentage";

  const handleLeaderboardTabChange = useCallback(
    (index: number) => setActiveLeaderboardIndex(index),
    [setActiveLeaderboardIndex]
  );
  const handleCompetitionTabChange = useCallback(
    (index: number) => setActiveCompetitionIndex(index),
    [setActiveCompetitionIndex]
  );

  useEffect(() => {
    setActiveLeaderboardIndex(0);
    setActiveCompetitionIndex(0);
  }, [isCompetitions]);

  useEffect(() => {
    if (activeLeaderboardIndex === 0) {
      setLeaderboardType("all");
    } else if (activeLeaderboardIndex === 1) {
      setLeaderboardType("30days");
    } else {
      setLeaderboardType("7days");
    }
  }, [activeLeaderboardIndex, setLeaderboardType]);

  return (
    <div className="GlobalLeaderboards">
      <LeaderboardNavigation />
      {isCompetitions && <CompetitionPrizes competition={activeCompetition} />}
      {isCompetitions && <CompetitionCountdown />}
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
      {!isCompetitions && (
        <Tab
          option={activeLeaderboardIndex}
          onChange={handleLeaderboardTabChange}
          options={leaderboardTabs}
          optionLabels={leaderboardLabels}
        />
      )}
      {isCompetitions && (
        <Tab
          option={activeCompetitionIndex}
          onChange={handleCompetitionTabChange}
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
