import SEO from "components/Common/SEO";
import { getPageTitle } from "lib/legacy";
import { useLocalStorage } from "react-use";
import { ALL_COMPETITIONS, LEADERBOARD_SELECTED_COMPETITION } from "domain/leaderboard/constants";
import { t, Trans } from "@lingui/macro";
import { useChainId } from "lib/chains";
import { getChainIcon } from "config/chains";

import "./Leaderboard.css";
import GeneralLeaderboards from "components/Leaderboard/GeneralLeaderboards";
import CompetitionLeaderboard from "components/Leaderboard/CompetitionLeaderboard";

export default function Leaderboard() {
  const { chainId } = useChainId();
  const [selectedCompetition, setSelectedCompetition] = useLocalStorage(LEADERBOARD_SELECTED_COMPETITION, "");

  return (
    <SEO title={getPageTitle("Leaderboards")}>
      <div className="default-container page-layout Leaderboard">
        <div className="section-title-block-wrapper">
          <div className="section-title-block">
            <div className="section-title-content">
              <div className="Page-title">
                <Trans>Leaderboards</Trans> <img alt="Chain Icon" src={getChainIcon(chainId)} />
              </div>
              <div className="Page-description">
                <Trans>Addresses trading statistics. Choose between general or competitions leaderboards.</Trans>
              </div>
              {ALL_COMPETITIONS[chainId].length > 0 && (
                <div style={{ marginTop: "2.5rem" }}>
                  <select
                    value={selectedCompetition}
                    onChange={(event) => setSelectedCompetition(event.target.value)}
                    className="transparent-btn"
                  >
                    <option value="">{t`General`}</option>
                    {ALL_COMPETITIONS[chainId].map((comp) => (
                      <option key={comp.index} value={comp.index}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
        {selectedCompetition === "" ? (
          <GeneralLeaderboards />
        ) : (
          <CompetitionLeaderboard competitionIndex={Number(selectedCompetition)} />
        )}
      </div>
    </SEO>
  );
}
