import { useState } from "react";
import Tab from "components/Tab/Tab";
import TopAccounts from "./TopAccounts";
import TopPositions from "./TopPositions";
import { t } from "@lingui/macro";

import "./GlobalLeaderboards.css";
import { useLeaderboardsData } from "domain/synthetics/leaderboards";

export default function GlobalLeaderboards() {
  const [activeLeaderboard, setActiveLeaderboard] = useState(0);
  const data = useLeaderboardsData();

  return (
    <div className="GlobalLeaderboards">
      <Tab
        option={activeLeaderboard}
        onChange={(val) => setActiveLeaderboard(val)}
        options={[0, 1]}
        optionLabels={[t`Top Addresses`, t`Top Open Positions`]}
      />
      {activeLeaderboard ? <TopPositions positions={data.positions} /> : <TopAccounts accounts={data.accounts} />}
    </div>
  );
}
