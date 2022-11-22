import { useWeb3React } from "@web3-react/core";
import Loader from "components/Common/Loader";
import { useCompetition } from "domain/leaderboard/useCompetition";

type Props = {
  competitionIndex: number;
};

export default function CompetitionLeaderboard({ competitionIndex }: Props) {
  const { chainId } = useWeb3React();
  const { data: competition, loading } = useCompetition(chainId, competitionIndex);

  if (loading) {
    return <Loader />;
  }

  return <div></div>;
}
