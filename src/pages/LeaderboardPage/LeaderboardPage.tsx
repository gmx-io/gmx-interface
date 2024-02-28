import { Trans, t } from "@lingui/macro";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";
import "./LeaderboardPage.scss";
import { LeaderboardContainer } from "./components/LeaderboardContainer";

export function Leaderboard() {
  const { chainId } = useChainId();

  return (
    <div className="default-container page-layout LeaderboardTest">
      <div className="section-title-block">
        <div className="section-title-content">
          <div className="Page-title">
            <Trans>Leaderboard</Trans> <img alt={t`Chain Icon`} src={getIcon(chainId, "network")} />
          </div>
          <div className="Page-description">
            <Trans>Leaderboard for traders on GMX V2.</Trans>
          </div>
        </div>
      </div>
      <LeaderboardContainer />
    </div>
  );
}
