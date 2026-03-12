import { Trans, t } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getChainName } from "config/chains";
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
import {
  selectLeaderboardIsLoading,
  selectLeaderboardSearchAddress,
  selectLeaderboardSetSearchAddress,
} from "context/SyntheticsStateContext/selectors/leaderboardSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { CompetitionType } from "domain/synthetics/leaderboard";
import { LEADERBOARD_PAGES } from "domain/synthetics/leaderboard/constants";
import { useChainId } from "lib/chains";
import { mustNeverExist } from "lib/types";
import { useBreakpoints } from "lib/useBreakpoints";
import { switchNetwork } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";

import ExternalLink from "components/ExternalLink/ExternalLink";
import SearchInput from "components/SearchInput/SearchInput";
import { BodyScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";

import { CompetitionPrizes } from "./CompetitionPrizes";
import { LeaderboardAccountsTable } from "./LeaderboardAccountsTable";
import { LeaderboardNavigation } from "./LeaderboardNavigation";
import { LeaderboardPositionsTable } from "./LeaderboardPositionsTable";

const competitionsTabs = [0, 1];
const leaderboardTimeframeTabs = [2, 1, 0];
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
  const [, setLeaderboardDataType] = useLeaderboardDataTypeState();

  const competitionLabels = useMemo(() => [t`Top PnL ($)`, t`Top PnL (%)`], []);
  const leaderboardTimeframeLabels = useMemo(() => [t`Total`, t`Last 30d`, t`Last 7d`], []);
  const leaderboardDataTypeLabels = useMemo(() => [t`Top addresses`, t`Top positions`], []);

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

  const searchAddress = useSelector(selectLeaderboardSearchAddress);
  const setSearchAddress = useSelector(selectLeaderboardSetSearchAddress);

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

  const description = useMemo(() => {
    switch (leaderboardPageKey) {
      case "leaderboard":
        return t`Leaderboard for traders on GMX V2`;

      case "march_13-20_2024":
      case "march_20-27_2024":
        return (
          <>
            <Trans>Powered by the Arbitrum DAO STIP.</Trans>{" "}
            <ExternalLink href="https://open.substack.com/pub/gmxio/p/the-gmx-eip4844-trading-competition">
              <Trans>Read the rules</Trans>
            </ExternalLink>
            .{wrongNetworkSwitcher}{" "}
          </>
        );

      default:
        throw mustNeverExist(leaderboardPageKey);
    }
  }, [leaderboardPageKey, wrongNetworkSwitcher]);

  const leaderboardDataTypeTabsOptions = useMemo(() => {
    return leaderboardDataTypeTabs.map((value) => ({
      value,
      label: leaderboardDataTypeLabels[value],
      className: {
        active: "!text-white !bg-blue-400",
        regular: "hover:!text-typography-primary !bg-button-secondary",
      },
    }));
  }, [leaderboardDataTypeLabels]);

  const leaderboardTimeframeTabsOptions = useMemo(() => {
    return leaderboardTimeframeTabs.map((value) => ({
      value,
      label: leaderboardTimeframeLabels[value],
    }));
  }, [leaderboardTimeframeLabels]);

  const competitionsTabsOptions = useMemo(() => {
    return competitionsTabs.map((value) => ({
      value,
      label: competitionLabels[value],
      className: {
        active: "!text-white !bg-blue-400",
        regular: "hover:!text-typography-primary !bg-button-secondary",
      },
    }));
  }, [competitionLabels]);

  const { isMobile } = useBreakpoints();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-12 p-12">
        <BodyScrollFadeContainer>
          <div>
            <LeaderboardNavigation />
          </div>
        </BodyScrollFadeContainer>
        <div className="text-body-medium font-medium text-typography-secondary">{description}</div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-16 rounded-t-8 border-b-1/2 border-slate-600 bg-slate-900 p-20 max-md:flex-col">
          {!isCompetition ? (
            <Tabs
              type="inline"
              selectedValue={activeLeaderboardDataTypeIndex}
              onChange={handleLeaderboardDataTypeTabChange}
              options={leaderboardDataTypeTabsOptions}
              className="max-md:w-full"
              regularOptionClassname="grow"
            />
          ) : (
            <Tabs
              type="inline"
              selectedValue={activeCompetitionIndex}
              onChange={handleCompetitionTabChange}
              options={competitionsTabsOptions}
              className="max-md:w-full"
              regularOptionClassname="grow"
            />
          )}

          <div className="flex gap-8 max-md:w-full max-md:justify-between">
            <SearchInput
              placeholder={isMobile ? t`Search` : t`Search address`}
              className="w-full max-w-[260px] max-md:min-w-[120px]"
              value={searchAddress}
              setValue={setSearchAddress}
            />
            {!isCompetition && (
              <Tabs
                selectedValue={activeLeaderboardTimeframeIndex}
                onChange={handleLeaderboardTimeframeTabChange}
                type="inline"
                className="shrink-0"
                options={leaderboardTimeframeTabsOptions}
              />
            )}
          </div>
        </div>

        {isCompetition && activeCompetition && (
          <BodyScrollFadeContainer>
            <div className="min-w-[1000px]">
              <CompetitionPrizes leaderboardPageKey={leaderboardPageKey} competitionType={activeCompetition} />
            </div>
          </BodyScrollFadeContainer>
        )}

        <Table activeCompetition={activeCompetition} />
      </div>
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

  return <div className="default-container">{table}</div>;
}

function AccountsTable({ activeCompetition }: { activeCompetition: CompetitionType | undefined }) {
  const accounts = useLeaderboardRankedAccounts();
  const isLoading = useSelector(selectLeaderboardIsLoading);
  const searchAddress = useSelector(selectLeaderboardSearchAddress);
  const accountsStruct = useMemo(
    () => ({
      isLoading,
      data: accounts ? accounts : [],
      error: null,
      updatedAt: 0,
    }),
    [accounts, isLoading]
  );

  return (
    <LeaderboardAccountsTable
      activeCompetition={activeCompetition}
      accounts={accountsStruct}
      searchAddress={searchAddress}
    />
  );
}

function PositionsTable() {
  const positions = useLeaderboardPositions();
  const isLoading = useSelector(selectLeaderboardIsLoading);
  const searchAddress = useSelector(selectLeaderboardSearchAddress);
  const positionsStruct = useMemo(
    () => ({
      isLoading,
      data: positions ? positions : [],
      error: null,
      updatedAt: 0,
    }),
    [positions, isLoading]
  );
  return <LeaderboardPositionsTable positions={positionsStruct} searchAddress={searchAddress} />;
}
