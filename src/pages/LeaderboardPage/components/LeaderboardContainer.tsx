import { t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";

import SearchInput from "components/SearchInput/SearchInput";
import { useLeaderboardAccounts } from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { LeaderboardAccountsTable } from "./LeaderboardAccountsTable";
import Tab from "components/Tab/Tab";
import { CompetitionType } from "domain/synthetics/leaderboard";

const competitionLabels = [t`Notional PnL`, t`PnL Percentage`];
const competitionsTabs = [0, 1];

export function LeaderboardContainer({ isCompetitions }: { isCompetitions: boolean }) {
  const [search, setSearch] = useState("");
  const accounts = useLeaderboardAccounts();
  const accountsStruct = useMemo(
    () => ({
      isLoading: !accounts,
      data: accounts ? accounts : [],
      error: null,
      updatedAt: 0,
    }),
    [accounts]
  );
  const handleKeyDown = useCallback(() => null, []);
  const [activeCompetitionIndex, setActiveCompetitionIndex] = useState(0);
  const activeCompetition: CompetitionType = activeCompetitionIndex === 0 ? "notionalPnl" : "pnlPercentage";

  return (
    <div className="GlobalLeaderboards">
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
