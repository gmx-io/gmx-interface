import { Trans, t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";
import cx from "classnames";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Tab from "components/Tab/Tab";
import { getChainName } from "config/chains";
import { getIcon } from "config/icons";
import {
  useLeaderboardChainId,
  useLeaderboardDataTypeState,
  useLeaderboardIsCompetition,
  useLeaderboardPageKey,
  useLeaderboardPositions,
  useLeaderboardRankedAccounts,
  useLeaderboardTimeframeTypeState,
  useLeaderboardTiming,
} from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { CompetitionType } from "domain/synthetics/leaderboard";
import { LEADERBOARD_PAGES } from "domain/synthetics/leaderboard/constants";
import { useChainId } from "lib/chains";
import { mustNeverExist } from "lib/types";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { useMedia } from "react-use";
import { CompetitionCountdown } from "./CompetitionCountdown";
import { CompetitionPrizes } from "./CompetitionPrizes";
import { LeaderboardAccountsTable } from "./LeaderboardAccountsTable";
import { LeaderboardNavigation } from "./LeaderboardNavigation";
import { LeaderboardPositionsTable } from "./LeaderboardPositionsTable";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { selectLeaderboardIsLoading } from "context/SyntheticsStateContext/selectors/leaderboardSelectors";

const competitionsTabs = [0, 1];
const leaderboardTimeframeTabs = [0, 1, 2];
const leaderboardDataTypeTabs = [0, 1];

export function LeaderboardContainer() {
  const isCompetition = useLeaderboardIsCompetition();

  const [activeLeaderboardTimeframeIndex, setActiveLeaderboardTimeframeIndex] = useState(0);
  const [activeLeaderboardDataTypeIndex, setActiveLeaderboardDataTypeIndex] = useState(0);
  const [activeCompetitionIndex, setActiveCompetitionIndex] = useState(0);

  const leaderboardPageKey = useLeaderboardPageKey();

  const { chainId } = useChainId();
  const { active } = useWallet();

  const page = LEADERBOARD_PAGES[leaderboardPageKey];

  const [, setLeaderboardTimeframeType] = useLeaderboardTimeframeTypeState();
  const [leaderboardDataType, setLeaderboardDataType] = useLeaderboardDataTypeState();

  const competitionLabels = useMemo(() => [t`Top PnL ($)`, t`Top PnL (%)`], []);
  const leaderboardTimeframeLabels = useMemo(() => [t`Total`, t`Last 30 days`, t`Last 7 days`], []);
  const leaderboardDataTypeLabels = useMemo(() => [t`Top Addresses`, t`Top Positions`], []);

  const activeCompetition: CompetitionType | undefined = isCompetition
    ? activeCompetitionIndex === 0
      ? "notionalPnl"
      : "pnlPercentage"
    : undefined;

  const handleLeaderboardTimeframeTabChange = useCallback(
    (index: number) => setActiveLeaderboardTimeframeIndex(index),
    [setActiveLeaderboardTimeframeIndex]
  );
  const handleCompetitionTabChange = useCallback(
    (index: number) => setActiveCompetitionIndex(index),
    [setActiveCompetitionIndex]
  );

  const handleLeaderboardDataTypeTabChange = useCallback(
    (index: number) => setActiveLeaderboardDataTypeIndex(index),
    []
  );

  const pageKey = useLeaderboardPageKey();
  const leaderboardChainId = useLeaderboardChainId();

  useEffect(() => {
    setActiveLeaderboardTimeframeIndex(0);
    setActiveCompetitionIndex(0);
  }, [pageKey]);

  useEffect(() => {
    if (activeLeaderboardTimeframeIndex === 0) {
      setLeaderboardTimeframeType("all");
    } else if (activeLeaderboardTimeframeIndex === 1) {
      setLeaderboardTimeframeType("30days");
    } else {
      setLeaderboardTimeframeType("7days");
    }
  }, [activeLeaderboardTimeframeIndex, setLeaderboardTimeframeType]);

  useEffect(() => {
    if (activeLeaderboardDataTypeIndex === 0) {
      setLeaderboardDataType("accounts");
    } else {
      setLeaderboardDataType("positions");
    }
  }, [activeLeaderboardDataTypeIndex, setLeaderboardDataType]);

  const title = useMemo(() => {
    switch (leaderboardPageKey) {
      case "leaderboard":
        return t`Global Leaderboard`;

      case "march_13-20_2024":
        return t`EIP-4844 Competition`;

      case "march_20-27_2024":
        return t`EIP-4844 Competition`;

      default:
        throw mustNeverExist(leaderboardPageKey);
    }
  }, [leaderboardPageKey]);

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
          This competition is held on the {getChainName(page.chainId)} network.{" "}
          <span className="link-underline" onClick={handleSwitchNetworkClick}>
            Change your network
          </span>{" "}
          to participate.
        </Trans>
      </div>
    );
  }, [chainId, handleSwitchNetworkClick, leaderboardChainId, leaderboardPageKey, page]);

  const isMobile = useMedia("(max-width: 1000px)");

  const description = useMemo(() => {
    switch (leaderboardPageKey) {
      case "leaderboard":
        return t`Leaderboard for traders on GMX V2.`;

      case "march_13-20_2024":
      case "march_20-27_2024":
        return (
          <>
            Powered by the Arbitrum DAO STIP.&nbsp;
            <ExternalLink href="https://open.substack.com/pub/gmxio/p/the-gmx-eip4844-trading-competition">
              <Trans>Read the rules</Trans>
            </ExternalLink>
            .{wrongNetworkSwitcher}{" "}
            {isMobile && (
              <>
                <CompetitionCountdown size="mobile" />
              </>
            )}
          </>
        );

      default:
        throw mustNeverExist(leaderboardPageKey);
    }
  }, [isMobile, leaderboardPageKey, wrongNetworkSwitcher]);

  return (
    <div className="GlobalLeaderboards">
      <LeaderboardNavigation />
      <div className="Leaderboard-Title default-container">
        <div>
          <h1 className="text-34 font-bold">
            {title} <img alt={t`Chain Icon`} src={getIcon(page.isCompetition ? page.chainId : chainId, "network")} />
          </h1>
          <div className="Leaderboard-Title__description">{description}</div>
        </div>
      </div>
      {!isCompetition && (
        <>
          <div className="LeaderboardContainer__competition-tabs default-container">
            <Tab
              option={activeLeaderboardDataTypeIndex}
              onChange={handleLeaderboardDataTypeTabChange}
              options={leaderboardDataTypeTabs}
              optionLabels={leaderboardDataTypeLabels}
            />
          </div>
        </>
      )}
      {!isCompetition && (
        <Tab
          option={activeLeaderboardTimeframeIndex}
          onChange={handleLeaderboardTimeframeTabChange}
          options={leaderboardTimeframeTabs}
          optionLabels={leaderboardTimeframeLabels}
          type="inline"
          className={cx("LeaderboardContainer__leaderboard-tabs default-container", {
            "LeaderboardContainer__leaderboard-tabs_positions": leaderboardDataType === "positions",
          })}
        />
      )}

      {isCompetition && (
        <>
          <div className="LeaderboardContainer__competition-tabs default-container">
            <Tab
              option={activeCompetitionIndex}
              onChange={handleCompetitionTabChange}
              options={competitionsTabs}
              optionLabels={competitionLabels}
            />
            {!isMobile && <CompetitionCountdown className="default-container" size="desktop" />}
          </div>
          <br />
          <br />
        </>
      )}
      {isCompetition && activeCompetition && (
        <CompetitionPrizes leaderboardPageKey={leaderboardPageKey} competitionType={activeCompetition} />
      )}

      <Table activeCompetition={activeCompetition} />
    </div>
  );
}

function Table({ activeCompetition }: { activeCompetition: CompetitionType | undefined }) {
  const { isStartInFuture } = useLeaderboardTiming();
  const leaderboardPageKey = useLeaderboardPageKey();
  const leaderboardDataType = useLeaderboardDataTypeState()[0];
  if (isStartInFuture) return null;

  const table =
    leaderboardPageKey === "leaderboard" && leaderboardDataType === "positions" ? (
      <PositionsTable />
    ) : (
      <AccountsTable activeCompetition={activeCompetition} />
    );

  return <div className="default-container !pr-0">{table}</div>;
}

function AccountsTable({ activeCompetition }: { activeCompetition: CompetitionType | undefined }) {
  const accounts = useLeaderboardRankedAccounts();
  const isLoading = useSelector(selectLeaderboardIsLoading);
  const accountsStruct = useMemo(
    () => ({
      isLoading,
      data: accounts ? accounts : [],
      error: null,
      updatedAt: 0,
    }),
    [accounts, isLoading]
  );

  return <LeaderboardAccountsTable activeCompetition={activeCompetition} accounts={accountsStruct} />;
}

function PositionsTable() {
  const positions = useLeaderboardPositions();
  const isLoading = useSelector(selectLeaderboardIsLoading);
  const positionsStruct = useMemo(
    () => ({
      isLoading,
      data: positions ? positions : [],
      error: null,
      updatedAt: 0,
    }),
    [positions, isLoading]
  );
  return <LeaderboardPositionsTable positions={positionsStruct} />;
}
