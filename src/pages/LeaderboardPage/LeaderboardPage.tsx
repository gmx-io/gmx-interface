import Footer from "components/Footer/Footer";
import { LeaderboardPageConfig } from "domain/synthetics/leaderboard";
import { LEADERBOARD_PAGES } from "domain/synthetics/leaderboard/constants";
import { useChainId } from "lib/chains";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import "./LeaderboardPage.scss";
import { LeaderboardContainer } from "./components/LeaderboardContainer";

export function LeaderboardPage() {
  return (
    <div className="page-layout">
      <LeaderboardContainer />
      <Footer />
    </div>
  );
}

export function CompetitionRedirect() {
  const { chainId } = useChainId();
  const history = useHistory();

  useEffect(() => {
    const closest = getClosestCompetition(chainId);
    history.replace(closest.href);
  }, [chainId, history]);

  return null;
}

function getClosestCompetition(chainId: number) {
  const competitions = Object.values(LEADERBOARD_PAGES).filter((page) => page.isCompetition && page.enabled);
  const competitionsOnSameNetwork = competitions.filter((page) => page.isCompetition && page.chainId === chainId);
  const competitionsNotOver = competitions.filter((page) => page.timeframe.to && page.timeframe.to > Date.now() / 1000);
  const competitionsNotOverOnsameNetwork = competitionsNotOver.filter(
    (page) => page.isCompetition && page.chainId === chainId
  );

  if (competitionsNotOverOnsameNetwork.length > 0) {
    return getClosestCompetitionByTimeframe(competitionsNotOverOnsameNetwork);
  }

  if (competitionsNotOver.length > 0) {
    return getClosestCompetitionByTimeframe(competitionsNotOver);
  }

  if (competitionsOnSameNetwork.length > 0) {
    return getClosestCompetitionByTimeframe(competitionsOnSameNetwork);
  }

  if (competitions.length > 0) {
    return getClosestCompetitionByTimeframe(competitions);
  }

  return LEADERBOARD_PAGES.leaderboard;
}

function getClosestCompetitionByTimeframe(competitions: LeaderboardPageConfig[]) {
  competitions.sort((a, b) => {
    const timeframeA = LEADERBOARD_PAGES[a.key].timeframe;
    const timeframeB = LEADERBOARD_PAGES[b.key].timeframe;
    return timeframeA.from - timeframeB.from;
  });
  return competitions[0];
}
