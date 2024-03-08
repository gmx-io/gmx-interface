import { Trans } from "@lingui/macro";
import Footer from "components/Footer/Footer";
import { LeaderboardPageConfig } from "domain/synthetics/leaderboard";
import { LEADERBOARD_PAGES, LEADERBOARD_TIMEFRAMES } from "domain/synthetics/leaderboard/constants";
import { useChainId } from "lib/chains";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import "./LeaderboardPage.scss";
import { LeaderboardContainer } from "./components/LeaderboardContainer";

export function LeaderboardPage() {
  const title = <Trans>Leaderboards</Trans>;

  return (
    <div className="default-container page-layout LeaderboardTest">
      <div className="section-title-block">
        <div className="section-title-content">
          <div className="Page-title">{title}</div>
        </div>
      </div>
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
  const competitions = Object.values(LEADERBOARD_PAGES)
    .filter((page) => page.isCompetition)
    .filter((page) => {
      const timeframe = LEADERBOARD_TIMEFRAMES[page.key];
      return timeframe.from < Date.now() / 1000 || (timeframe.to && timeframe.to > Date.now() / 1000);
    });
  const competitionsOnSameNetwork = competitions.filter((page) => page.isCompetition && page.chainId === chainId);

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
    const timeframeA = LEADERBOARD_TIMEFRAMES[a.key];
    const timeframeB = LEADERBOARD_TIMEFRAMES[b.key];
    return timeframeA.from - timeframeB.from;
  });
  return competitions[0];
}
