import React from "react";
import SEO from "components/Common/SEO";
import { getPageTitle } from "lib/legacy";
import { t, Trans } from "@lingui/macro";
import GloballLeaderboards from "components/GlobalLeaderboards/GlobalLeaderboards";
import PageTitle from "components/PageTitle/PageTitle";

import "./Leaderboards.css";

export default function Leaderboard() {
  return (
    <SEO title={getPageTitle("Leaderboards")}>
      <div className="default-container page-layout Leaderboard">
        <PageTitle isTop title={t`Leaderboards`} subtitle={<Trans>Addresses V2 trading statistics.</Trans>} />
        <GloballLeaderboards />
      </div>
    </SEO>
  );
}
