import React from "react";
import SEO from "components/Common/SEO";
import { getPageTitle } from "lib/legacy";
import { useLocalStorage } from "react-use";
import { t, Trans } from "@lingui/macro";
import { useChainId } from "lib/chains";
import { getChainIcon } from "config/chains";
import GloballLeaderboards from "components/GlobalLeaderboards";

import "./index.css";

export default function Leaderboard() {
  const { chainId } = useChainId();
  const [selectedCompetition, setSelectedCompetition] = useLocalStorage("leaderboard-type", "Global");

  return (
    <SEO title={getPageTitle("Leaderboards")}>
      <div className="default-container page-layout Leaderboard">
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              <Trans>Leaderboards</Trans> <img alt="Chain Icon" src={getChainIcon(chainId)} />
            </div>
            <div className="Page-description">
              <Trans>Addresses trading statistics. Choose between general or competitions leaderboards.</Trans>
            </div>
            <div style={{ marginTop: "2.5rem" }}>
              <select
                value={selectedCompetition}
                onChange={(event) => setSelectedCompetition(event.target.value)}
                className="transparent-btn"
              >
                <option value="">{t`General`}</option>
              </select>
            </div>
          </div>
        </div>
        <GloballLeaderboards />
      </div>
    </SEO>
  );
}
