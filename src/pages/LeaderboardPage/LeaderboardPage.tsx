import { Trans, t } from "@lingui/macro";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import "./LeaderboardPage.scss";
import { LeaderboardContainer } from "./components/LeaderboardContainer";
import Footer from "components/Footer/Footer";

export function Leaderboard({ isCompetitions }: { isCompetitions?: boolean }) {
  const { chainId } = useChainId();

  const title = <Trans>Leaderboards</Trans>;

  return (
    <div className="default-container page-layout LeaderboardTest">
      <div className="section-title-block">
        <div className="section-title-content">
          <div className="Page-title">
            {title} <img alt={t`Chain Icon`} src={getIcon(chainId, "network")} />
          </div>
        </div>
      </div>
      <LeaderboardContainer isCompetitions={isCompetitions ?? false} />
      <Footer />
    </div>
  );
}
