import { useState } from "react";
import Tab from "components/Tab/Tab";
import TopAccounts from "./TopAccounts";
import TopPositions from "./TopPositions";
import { LeaderboardContextProvider } from "./Context";
import { t } from '@lingui/macro';

import "./index.css";

export default function GeneralLeaderboards() {
  const [activeLeaderboard, setActiveLeaderboard] = useState(0);

  return (
    <LeaderboardContextProvider>
      <div>
        <div className="tab-container">
          <Tab
            option={activeLeaderboard}
            onChange={(val) => setActiveLeaderboard(val)}
            options={[0, 1]}
            optionLabels={[t`Top Addresses`, t`Top Open Positions`]} // TODO: add messages
          />
        </div>
        {activeLeaderboard === 0 && <TopAccounts/>}
        {activeLeaderboard === 1 && <TopPositions/>}
      </div>
    </LeaderboardContextProvider>
  );
}
