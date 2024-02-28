import { t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useMemo, useState } from "react";

import SearchInput from "components/SearchInput/SearchInput";
import { useLeaderboardAccounts } from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { LeaderboardAccountsTable } from "./LeaderboardAccountsTable";

export function LeaderboardContainer() {
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

  return (
    <div className="GlobalLeaderboards">
      <div className="LeaderboardHeader">
        <SearchInput
          placeholder={t`Search Address`}
          className={cx("LeaderboardSearch")}
          value={search}
          setValue={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <LeaderboardAccountsTable accounts={accountsStruct} search={search} />
    </div>
  );
}
