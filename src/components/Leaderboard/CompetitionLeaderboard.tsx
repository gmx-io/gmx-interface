import Loader from "components/Common/Loader";
import Tab from "components/Tab/Tab";
import { useCompetition } from "domain/leaderboard/useCompetition";
import { useChainId } from "lib/chains";
import { useState, useEffect } from "react";
import { IndividualLeaderboard } from "./IndividualLeaderboard";
import { TeamLeaderboard } from "./TeamLeaderboard";

type Props = {
  competitionIndex: number;
};

export default function CompetitionLeaderboard({ competitionIndex }: Props) {
  const { chainId } = useChainId();
  const { data: competition, loading } = useCompetition(chainId, competitionIndex);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<number>(0);

  useEffect(() => {
    if (competition.type === 1 || competition.type === 3) {
      setSelectedLeaderboard(0);
    } else {
      setSelectedLeaderboard(1);
    }
  }, [competition]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      {competition.type === 3 && (
        <div className="tab-container">
          <Tab
            option={selectedLeaderboard}
            onChange={(val) => setSelectedLeaderboard(val)}
            options={[0, 1]}
            optionLabels={["Individual", "Team"]}
          />
        </div>
      )}
      {selectedLeaderboard === 0 && <IndividualLeaderboard competitionIndex={competitionIndex} />}
      {selectedLeaderboard === 1 && <TeamLeaderboard competitionIndex={competitionIndex} />}
    </div>
  );
}
