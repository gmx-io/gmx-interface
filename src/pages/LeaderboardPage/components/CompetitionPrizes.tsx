import { t } from "@lingui/macro";
import { useCallback, useMemo } from "react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { Link } from "react-router-dom";
import type { Address } from "viem";

import { useLeaderboardTiming } from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import {
  selectLeaderboardRankedAccountsByPnl,
  selectLeaderboardRankedAccountsByPnlPercentage,
} from "context/SyntheticsStateContext/selectors/leaderboardSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { CompetitionType, LeaderboardAccount, LeaderboardPageKey } from "domain/synthetics/leaderboard";
import { shortenAddress } from "lib/legacy";
import { mustNeverExist } from "lib/types";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/AccountDashboard";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import rank1Icon from "img/rank1.svg";
import rank2Icon from "img/rank2.svg";
import rank3Icon from "img/rank3.svg";
import rank4Icon from "img/rank4.svg";

const iconByType = {
  gold: rank1Icon,
  silver: rank2Icon,
  bronze: rank3Icon,
  other: rank4Icon,
} as const;

type Prize = {
  title: string;
  description: string;
  imgType: "gold" | "silver" | "bronze" | "other";
  key: string;
  winners: LeaderboardAccount[];
};

function getWinners(
  fromRank: number,
  toRank: number,
  competitors: LeaderboardAccount[] | undefined,
  hasEnded: boolean
) {
  if (!hasEnded) return [];
  return competitors ? competitors.slice(fromRank - 1, toRank) : [];
}

function getWinner(rank: number, competitors: LeaderboardAccount[] | undefined, hasEnded: boolean) {
  if (!hasEnded) return [];
  return competitors && competitors.length > 0 ? [competitors[rank - 1]] ?? [] : [];
}

export function CompetitionPrizes({
  competitionType,
  leaderboardPageKey,
}: {
  competitionType: CompetitionType;
  leaderboardPageKey: LeaderboardPageKey;
}) {
  const { isEndInFuture } = useLeaderboardTiming();
  const hasEnded = isEndInFuture === false;
  const accountsByPnl = useSelector(selectLeaderboardRankedAccountsByPnl);
  const accountsByPnlPercentage = useSelector(selectLeaderboardRankedAccountsByPnlPercentage);
  const accounts = competitionType === "notionalPnl" ? accountsByPnl : accountsByPnlPercentage;

  const prizes: Prize[] = useMemo(() => {
    if (leaderboardPageKey === "leaderboard") {
      return [];
    }

    switch (competitionType) {
      case "notionalPnl":
        return [
          {
            title: t`1st Place`,
            description: `50,000 ARB`,
            imgType: "gold",
            key: "1",
            winners: getWinner(1, accounts, hasEnded),
          },
          {
            title: t`2nd Place`,
            description: `25,000 ARB`,
            imgType: "silver",
            key: "2",
            winners: getWinner(2, accounts, hasEnded),
          },
          {
            title: t`3rd Place`,
            imgType: "bronze",
            description: `10,000 ARB`,
            key: "3",
            winners: getWinner(3, accounts, hasEnded),
          },
          {
            title: t`4-18 Places`,
            imgType: "other",
            description: `1,000 ARB`,
            key: "4-18",
            winners: getWinners(4, 18, accounts, hasEnded),
          },
        ];
      case "pnlPercentage":
        return [
          {
            title: t`1st Place`,
            description: `10,000 ARB`,
            imgType: "gold",
            key: "1",
            winners: getWinner(1, accounts, hasEnded),
          },
          {
            title: t`2nd Place`,
            description: `7,000 ARB`,
            imgType: "silver",
            key: "2",
            winners: getWinner(2, accounts, hasEnded),
          },
          {
            title: t`3rd Place`,
            imgType: "bronze",
            description: `5,000 ARB`,
            key: "3",
            winners: getWinner(3, accounts, hasEnded),
          },
          {
            title: t`4-18 Places`,
            imgType: "other",
            description: `1,200 ARB`,
            key: "4-18",
            winners: getWinners(4, 18, accounts, hasEnded),
          },
        ];

      default:
        throw mustNeverExist(competitionType);
    }
  }, [accounts, competitionType, hasEnded, leaderboardPageKey]);

  return (
    <div className="CompetitionPrizes default-container">
      {prizes.map((prize) => (
        <CompetitionPrize prize={prize} key={prize.key} />
      ))}
    </div>
  );
}

function CompetitionPrize({ prize }: { prize: Prize }) {
  return (
    <div className="CompetitionPrizes__prize-container">
      <div className="CompetitionPrizes__prize">
        <div className="CompetitionPrizes__prize-icon-container">
          <img className="CompetitionPrizes__prize-icon" src={iconByType[prize.imgType]} />
        </div>
        <div className="CompetitionPrizes__prize-text">
          <div className="CompetitionPrizes__prize-title">{prize.title}</div>
          <div className="CompetitionPrizes__prize-description">{prize.description}</div>
        </div>
      </div>
      <CompetitionPrizeWinners winners={prize.winners} />
    </div>
  );
}

function CompetitionPrizeWinners({ winners }: { winners: LeaderboardAccount[] }) {
  const winner = winners[0];
  const showCount = winners.length === 1 ? 1 : Math.min(4, winners.length);
  const restCount = winners.length - showCount;

  const oneWinner =
    showCount === 1 && winner ? (
      <div className="CompetitionPrizes__prize-winners">
        <Link
          target="_blank"
          to={buildAccountDashboardUrl(winner.account as Address, undefined, 2)}
          className="CompetitionPrizes__prize-winner"
        >
          <Jazzicon diameter={20} seed={jsNumberForAddress(winner.account)} />
          <div className="CompetitionPrizes__prize-rest">{shortenAddress(winner.account, 14)}</div>
        </Link>
      </div>
    ) : null;
  const manyWinnersContent =
    winners.length > 1 ? (
      <div className="CompetitionPrizes__prize-winners">
        {winners.slice(0, showCount).map((winner) => (
          <Link
            target="_blank"
            to={buildAccountDashboardUrl(winner.account as Address, undefined, 2)}
            className="CompetitionPrizes__prize-winner CompetitionPrizes__prize-winner_many "
            key={winner.account}
          >
            <Jazzicon diameter={20} seed={jsNumberForAddress(winner.account)} />
          </Link>
        ))}
        {restCount > 0 && <div className="CompetitionPrizes__prize-rest">{`+${restCount}`}</div>}
      </div>
    ) : null;
  const renderTooltipContent = useCallback(() => {
    return winners.map((winner) => (
      <Link
        target="_blank"
        to={buildAccountDashboardUrl(winner.account as Address, undefined, 2)}
        className="CompetitionPrizes__tooltip-winner"
        key={winner.account}
      >
        <Jazzicon diameter={20} seed={jsNumberForAddress(winner.account)} />
        <div className="CompetitionPrizes__prize-rest">{shortenAddress(winner.account, 20)}</div>
      </Link>
    ));
  }, [winners]);
  const manyWinners =
    restCount > 0 ? (
      <TooltipWithPortal
        className="CompetitionPrizes__prize-winner-tooltip"
        portalClassName="CompetitionPrizes__prize-winner-tooltip"
        position="bottom"
        handle={manyWinnersContent}
        renderContent={renderTooltipContent}
      />
    ) : (
      manyWinnersContent
    );

  if (winners.length === 0) return null;

  return (
    <div className="CompetitionPrizes__prize-winners-container">
      <div className="CompetitionPrizes__prize-winners-text">{showCount === 1 ? t`Winner:` : t`Winners:`}</div>
      {oneWinner}
      {manyWinners}
    </div>
  );
}
