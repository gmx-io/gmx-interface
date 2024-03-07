import { Trans, t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import ExternalLink from "components/ExternalLink/ExternalLink";
import Tab from "components/Tab/Tab";
import {
  useLeaderboardIsCompetition,
  useLeaderboardPageKey,
  useLeaderboardRankedAccounts,
  useLeaderboardTiming,
  useLeaderboardTypeState,
} from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { CompetitionType } from "domain/synthetics/leaderboard";
import { mustNeverExist } from "lib/types";
import { CompetitionCountdown } from "./CompetitionCountdown";
import { CompetitionPrizes } from "./CompetitionPrizes";
import { LeaderboardAccountsTable } from "./LeaderboardAccountsTable";
import { LeaderboardNavigation } from "./LeaderboardNavigation";

const competitionLabels = [t`Notional PnL`, t`PnL Percentage`];
const competitionsTabs = [0, 1];

const leaderboardLabels = [t`Total`, t`Last 30 days`, t`Last 7 days`];
const leaderboardTabs = [0, 1, 2];

export function LeaderboardContainer() {
  const { isStartInFuture } = useLeaderboardTiming();
  const isCompetition = useLeaderboardIsCompetition();
  const [activeLeaderboardIndex, setActiveLeaderboardIndex] = useState(0);
  const [activeCompetitionIndex, setActiveCompetitionIndex] = useState(0);
  const accounts = useLeaderboardRankedAccounts();
  const isLoading = !accounts;
  const accountsStruct = useMemo(
    () => ({
      isLoading,
      data: accounts ? accounts : [],
      error: null,
      updatedAt: 0,
    }),
    [accounts, isLoading]
  );

  const [, setLeaderboardType] = useLeaderboardTypeState();

  const activeCompetition: CompetitionType = activeCompetitionIndex === 0 ? "notionalPnl" : "pnlPercentage";
  const leaderboardPageKey = useLeaderboardPageKey();

  const handleLeaderboardTabChange = useCallback(
    (index: number) => setActiveLeaderboardIndex(index),
    [setActiveLeaderboardIndex]
  );
  const handleCompetitionTabChange = useCallback(
    (index: number) => setActiveCompetitionIndex(index),
    [setActiveCompetitionIndex]
  );

  const pageKey = useLeaderboardPageKey();

  useEffect(() => {
    setActiveLeaderboardIndex(0);
    setActiveCompetitionIndex(0);
  }, [pageKey]);

  useEffect(() => {
    if (activeLeaderboardIndex === 0) {
      setLeaderboardType("all");
    } else if (activeLeaderboardIndex === 1) {
      setLeaderboardType("30days");
    } else {
      setLeaderboardType("7days");
    }
  }, [activeLeaderboardIndex, setLeaderboardType]);

  const title = useMemo(() => {
    switch (leaderboardPageKey) {
      case "leaderboard":
        return t`Global leaderboard`;

      case "march24":
        return t`March '24 Relative PnL`;

      case "test1":
        return "Test championship March '24";

      case "test2":
        return "Test championship Feb '24";

      default:
        throw mustNeverExist(leaderboardPageKey);
    }
  }, [leaderboardPageKey]);

  const description = useMemo(() => {
    switch (leaderboardPageKey) {
      case "leaderboard":
        return t`Leaderboard for traders on GMX V2`;

      case "march24":
      case "test1":
      case "test2":
        return (
          <ExternalLink href="#">
            <Trans>Read the rules</Trans>
          </ExternalLink>
        );

      default:
        throw mustNeverExist(leaderboardPageKey);
    }
  }, [leaderboardPageKey]);

  return (
    <div className="GlobalLeaderboards">
      <LeaderboardNavigation />
      <div className="Leaderboard-Title">
        <div>
          <h1>{title}</h1>
          <div className="Leaderboard-Title__description">{description}</div>
        </div>
        {isCompetition && <CompetitionCountdown />}
      </div>
      {!isCompetition && (
        <>
          <Tab
            option={activeLeaderboardIndex}
            onChange={handleLeaderboardTabChange}
            options={leaderboardTabs}
            optionLabels={leaderboardLabels}
          />
          <br />
          <br />
        </>
      )}
      {isCompetition && (
        <>
          <Tab
            option={activeCompetitionIndex}
            onChange={handleCompetitionTabChange}
            options={competitionsTabs}
            optionLabels={competitionLabels}
          />
          <br />
          <br />
        </>
      )}
      {isCompetition && (
        <CompetitionPrizes leaderboardPageKey={leaderboardPageKey} competitionType={activeCompetition} />
      )}

      {!isStartInFuture && (
        <>
          <LeaderboardAccountsTable activeCompetition={activeCompetition} accounts={accountsStruct} />
        </>
      )}
    </div>
  );
}

// @ts-ignore
window.getFiberNodes = () => {
  const elems = document.body.getElementsByTagName("*");
  const nodes: any[] = [];
  for (let i = 0; i < elems.length; i++) {
    const keys = Object.keys(elems[i]);
    const fiberNodeKey = keys.find((key) => key.startsWith("__reactFiber$"));
    if (fiberNodeKey) {
      nodes.push(elems[i][fiberNodeKey]);
    }
  }
  return nodes;
};
