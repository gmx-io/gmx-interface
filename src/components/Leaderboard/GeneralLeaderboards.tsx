import { useState } from "react";
import Tab from "components/Tab/Tab";
import "../../components/Leaderboard/Leaderboard.css";
import GeneralSettledLeaderboard from "./GeneralSettledLeaderboard";
import GeneralOpenLeaderboard from "./GeneralOpenLeaderboard";

export default function GeneralLeaderboards() {
  const [activeLeaderboard, setActiveLeaderboard] = useState(0);

  return (
    <div>
      <div className="tab-container">
        <Tab
          option={activeLeaderboard}
          onChange={(val) => setActiveLeaderboard(val)}
          options={[0, 1]}
          optionLabels={["Top Settled", "Top Open"]}
        />
      </div>

      {activeLeaderboard === 0 && <GeneralSettledLeaderboard />}
      {activeLeaderboard === 1 && <GeneralOpenLeaderboard />}
    </div>
  );
}
