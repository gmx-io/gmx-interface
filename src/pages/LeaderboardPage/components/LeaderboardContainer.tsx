import { Trans, t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import ExternalLink from "components/ExternalLink/ExternalLink";
import Tab from "components/Tab/Tab";
import {
  useLeaderboardChainId,
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
import { LEADERBOARD_PAGES } from "domain/synthetics/leaderboard/constants";
import { useChainId } from "lib/chains";
import { getIcon } from "config/icons";
import { getChainName } from "config/chains";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

const competitionLabels = [t`Top PnL ($)`, t`Top PnL (%)`];
const competitionsTabs = [0, 1];

const leaderboardLabels = [t`Total`, t`Last 30 days`, t`Last 7 days`];
const leaderboardTabs = [0, 1, 2];

export function LeaderboardContainer() {
  const { isStartInFuture } = useLeaderboardTiming();
  const isCompetition = useLeaderboardIsCompetition();
  const [activeLeaderboardIndex, setActiveLeaderboardIndex] = useState(0);
  const [activeCompetitionIndex, setActiveCompetitionIndex] = useState(0);
  const accounts = useLeaderboardRankedAccounts();
  const leaderboardPageKey = useLeaderboardPageKey();
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
  const { chainId } = useChainId();
  const { active } = useWallet();

  const page = LEADERBOARD_PAGES[leaderboardPageKey];

  const [, setLeaderboardType] = useLeaderboardTypeState();

  const activeCompetition: CompetitionType | undefined = isCompetition
    ? activeCompetitionIndex === 0
      ? "notionalPnl"
      : "pnlPercentage"
    : undefined;

  const handleLeaderboardTabChange = useCallback(
    (index: number) => setActiveLeaderboardIndex(index),
    [setActiveLeaderboardIndex]
  );
  const handleCompetitionTabChange = useCallback(
    (index: number) => setActiveCompetitionIndex(index),
    [setActiveCompetitionIndex]
  );

  const pageKey = useLeaderboardPageKey();
  const leaderboardChainId = useLeaderboardChainId();

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

  const title = LEADERBOARD_PAGES[leaderboardPageKey].label;

  const handleSwitchNetworkClick = useCallback(() => {
    switchNetwork(leaderboardChainId, active);
  }, [active, leaderboardChainId]);

  const wrongNetworkSwitcher = useMemo(() => {
    if (leaderboardPageKey === "leaderboard") return null;
    if (chainId === leaderboardChainId) return null;
    if (!page.isCompetition) return null;

    return (
      <div className="Leaderboard__another-network">
        <Trans>
          This competition is held on the {getChainName(page.chainId)} network, please{" "}
          <span className="link-underline" onClick={handleSwitchNetworkClick}>
            change your network
          </span>
          .
        </Trans>
      </div>
    );
  }, [chainId, handleSwitchNetworkClick, leaderboardChainId, leaderboardPageKey, page]);

  const description = useMemo(() => {
    switch (leaderboardPageKey) {
      case "leaderboard":
        return t`Leaderboard for traders on GMX V2`;

      case "march_13-20_2024":
      case "march_20-27_2024":
      case "march_8-22_2024":
      case "march24fuji":
        return (
          <>
            Powered by the Arbitrum DAO STIP.&nbsp;
            <ExternalLink href="https://open.substack.com/pub/gmxio/p/the-gmx-eip4844-trading-competition">
              <Trans>Read the rules.</Trans>
            </ExternalLink>
            {wrongNetworkSwitcher}
          </>
        );

      default:
        throw mustNeverExist(leaderboardPageKey);
    }
  }, [leaderboardPageKey, wrongNetworkSwitcher]);

  return (
    <div className="GlobalLeaderboards">
      <LeaderboardNavigation />
      <div className="Leaderboard-Title">
        <div>
          <h1>
            {title} <img alt={t`Chain Icon`} src={getIcon(page.isCompetition ? page.chainId : chainId, "network")} />
          </h1>
          <div className="Leaderboard-Title__description">{description}</div>
        </div>
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
          <div className="LeaderboardContainer__competition-tabs">
            <Tab
              option={activeCompetitionIndex}
              onChange={handleCompetitionTabChange}
              options={competitionsTabs}
              optionLabels={competitionLabels}
            />
            <CompetitionCountdown />
          </div>
          <br />
          <br />
        </>
      )}
      {isCompetition && activeCompetition && (
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
