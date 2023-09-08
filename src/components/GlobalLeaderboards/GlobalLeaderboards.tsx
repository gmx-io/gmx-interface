import { useState } from "react";
import Tab from "components/Tab/Tab";
import TopAccounts from "./TopAccounts";
import TopPositions from "./TopPositions";
import { LeaderboardContextProvider } from "./Context";
import { t } from '@lingui/macro';

import "./GlobalLeaderboards.css";

export default function GlobalLeaderboards() {
  const [activeLeaderboard, setActiveLeaderboard] = useState(0);

  return (
    <LeaderboardContextProvider>
      <div className="GlobalLeaderboards">
        <Tab
          option={activeLeaderboard}
          onChange={(val) => setActiveLeaderboard(val)}
          options={[0, 1]}
          optionLabels={[t`Top Addresses`, t`Top Open Positions`]} // TODO: add messages
        />
        {activeLeaderboard ? <TopPositions/> : <TopAccounts/>}
      </div>
    </LeaderboardContextProvider>
  );
}
