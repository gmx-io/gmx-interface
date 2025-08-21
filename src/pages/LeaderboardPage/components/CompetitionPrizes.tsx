import { t } from "@lingui/macro";
import { useCallback, useMemo } from "react";
import { FaChevronRight } from "react-icons/fa6";
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
import { useBreakpoints } from "lib/breakpoints";
import { shortenAddress } from "lib/legacy";
import { mustNeverExist } from "lib/types";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import { BodyScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
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
  if (!hasEnded || !competitors?.length) return [];

  return [competitors[rank - 1]];
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
    <BodyScrollFadeContainer className="flex border-b-stroke border-slate-600">
      {prizes.map((prize) => (
        <CompetitionPrize prize={prize} key={prize.key} />
      ))}
    </BodyScrollFadeContainer>
  );
}

function CompetitionPrize({ prize }: { prize: Prize }) {
  return (
    <div className="flex grow items-center justify-between gap-8 border-r-stroke border-slate-600 bg-slate-900 p-20 last:border-r-0">
      <div className="flex items-center gap-12">
        <img className="size-52" src={iconByType[prize.imgType]} />

        <div>
          <div className="text-body-medium font-medium text-slate-100">{prize.title}</div>
          <div className="text-20 font-medium">{prize.description}</div>
        </div>
      </div>
      <CompetitionPrizeWinners winners={prize.winners} />
    </div>
  );
}

function CompetitionPrizeWinners({ winners }: { winners: LeaderboardAccount[] }) {
  const winner = winners[0];

  const { isSmallDesktop } = useBreakpoints();

  let handle = winner ? (
    <Link
      target="_blank"
      to={buildAccountDashboardUrl(winner.account as Address, undefined, 2)}
      className="flex items-center gap-6 rounded-full bg-slate-700 px-12 py-8 hover:bg-slate-600"
    >
      <div className="text-13 font-medium">{shortenAddress(winner.account, 8)}</div>
      <Jazzicon diameter={16} seed={jsNumberForAddress(winner.account)} />
    </Link>
  ) : null;

  if (isSmallDesktop) {
    handle = winner ? (
      <Link
        target="_blank"
        to={buildAccountDashboardUrl(winner.account as Address, undefined, 2)}
        className={`flex items-center gap-6 rounded-full bg-slate-600 p-10 text-slate-100
        hover:bg-slate-500 hover:text-white active:bg-slate-500 active:text-white`}
      >
        <FaChevronRight size={12} />
      </Link>
    ) : null;
  }

  const renderTooltipContent = useCallback(() => {
    return winners.map((winner) => (
      <Link
        target="_blank"
        to={buildAccountDashboardUrl(winner.account as Address, undefined, 2)}
        className="flex items-center gap-4 px-12 py-8 !text-white !no-underline hover:bg-fill-surfaceHover"
        key={winner.account}
      >
        <Jazzicon diameter={20} seed={jsNumberForAddress(winner.account)} />
        <div className="CompetitionPrizes__prize-rest">{shortenAddress(winner.account, 20)}</div>
      </Link>
    ));
  }, [winners]);

  if (winners.length === 0) return null;

  return winners.length > 1 ? (
    <TooltipWithPortal
      tooltipClassName=""
      position="bottom"
      handle={handle}
      renderContent={renderTooltipContent}
      styleType="none"
    />
  ) : (
    handle
  );
}
