import { useState } from "react";
import { t } from "@lingui/macro";
import cx from "classnames";
import debounce from "lodash/debounce";
import Tab from "components/Tab/Tab";
import TopAccounts from "./TopAccounts";
import TopPositions from "./TopPositions";
import { useLeaderboardsData } from "domain/synthetics/leaderboards";

import "./GlobalLeaderboards.css";
import SearchInput from "components/SearchInput/SearchInput";

export default function GlobalLeaderboards() {
  const [activeLeaderboard, setActiveLeaderboard] = useState(0);
  const [search, setSearch] = useState("");
  const data = useLeaderboardsData();
  const onSearchInput = debounce((e) => setSearch(e.target.value.trim().toLowerCase()), 300);

  return (
    <div className="GlobalLeaderboards">
      <Tab
        option={activeLeaderboard}
        onChange={(val) => setActiveLeaderboard(val)}
        options={[0, 1]}
        optionLabels={[t`Top Addresses`, t`Top Open Positions`]}
      />
      <div className="LeaderboardHeader">
        <SearchInput
          placeholder={activeLeaderboard ? t`Search Address or Market` : t`Search Address`}
          onInput={onSearchInput}
          setValue={() => {}}
          onKeyDown={() => {}}
          className={cx("LeaderboardSearch", activeLeaderboard && "TopPositionsSearch")}
          autoFocus={false}
        />
      </div>
      {activeLeaderboard ? (
        <TopPositions positions={data.positions} search={search} />
      ) : (
        <TopAccounts accounts={data.accounts} search={search} />
      )}
    </div>
  );
}
