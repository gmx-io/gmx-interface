import { Trans, t } from "@lingui/macro";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import "./LeaderboardPage.scss";
import { LeaderboardContainer } from "./components/LeaderboardContainer";

export function Leaderboard({ isCompetitions }: { isCompetitions?: boolean }) {
  const { chainId } = useChainId();

  const title = isCompetitions ? <Trans>March 2024 Competitions</Trans> : <Trans>Leaderboard</Trans>;
  const description = isCompetitions ? (
    <Trans>Competitions for traders on GMX V2.</Trans>
  ) : (
    <Trans>Leaderboard for traders on GMX V2.</Trans>
  );

  return (
    <div className="default-container page-layout LeaderboardTest">
      <div className="section-title-block">
        <div className="section-title-content">
          <div className="Page-title">
            {title} <img alt={t`Chain Icon`} src={getIcon(chainId, "network")} />
          </div>
          <div className="Page-description">{description}</div>
        </div>
      </div>
      <LeaderboardContainer isCompetitions={isCompetitions ?? false} />
    </div>
  );
}
