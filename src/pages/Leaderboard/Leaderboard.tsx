import React from "react";
import SEO from "components/Common/SEO";
import { getPageTitle } from "lib/legacy";
import { t, Trans } from "@lingui/macro";
import GloballLeaderboards from "components/GlobalLeaderboards/GlobalLeaderboards";
import PageTitle from "components/PageTitle/PageTitle";

import "./Leaderboard.css";
import Footer from "components/Footer/Footer";

export default function Leaderboard() {
  return (
    <SEO title={getPageTitle("Leaderboard")}>
      <div className="default-container page-layout Leaderboard">
        <PageTitle isTop title={t`Leaderboard`} subtitle={<Trans>Leaderboard for traders on GMX V2.</Trans>} />
        <GloballLeaderboards />
      </div>
      <Footer />
    </SEO>
  );
}
