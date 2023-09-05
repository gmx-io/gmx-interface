import React from "react";
import SEO from "components/Common/SEO";
import { getPageTitle } from "lib/legacy";
import { t, Trans } from "@lingui/macro";
import { useChainId } from "lib/chains";
import GloballLeaderboards from "components/GlobalLeaderboards/GlobalLeaderboards";
import { getIcon } from "config/icons";

import "./Leaderboards.css";

export default function Leaderboard() {
  const { chainId } = useChainId();

  return (
    <SEO title={getPageTitle("Leaderboards")}>
      <div className="default-container page-layout Leaderboard">
        <div className="section-title-block">
          <div className="section-title-content">
            <div className="Page-title">
              <Trans>Leaderboards</Trans> <img alt={t`Chain Icon`} src={getIcon(chainId, "network")} />
            </div>
            <div className="Page-description">
              <Trans>Addresses trading statistics.</Trans>
            </div>
          </div>
        </div>
        <GloballLeaderboards />
      </div>
    </SEO>
  );
}
