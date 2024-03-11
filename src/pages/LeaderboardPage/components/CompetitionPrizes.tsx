import { t } from "@lingui/macro";
import { CompetitionType, LeaderboardPageKey } from "domain/synthetics/leaderboard";
import { mustNeverExist } from "lib/types";
import { useMemo } from "react";
import rank1Icon from "img/rank1.png";
import rank2Icon from "img/rank2.png";
import rank3Icon from "img/rank3.png";
import rank4Icon from "img/rank4.png";

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
};

export function CompetitionPrizes({
  competitionType,
  leaderboardPageKey,
}: {
  competitionType: CompetitionType;
  leaderboardPageKey: LeaderboardPageKey;
}) {
  const prizes: Prize[] = useMemo(() => {
    if (leaderboardPageKey === "leaderboard") {
      return [];
    }

    switch (competitionType) {
      case "notionalPnl":
        return [
          { title: t`1st Place`, description: t`50 000 ARB`, imgType: "gold", key: "1" },
          {
            title: t`2nd Place`,
            description: t`25 000 ARB`,
            imgType: "silver",
            key: "2",
          },
          {
            title: t`3rd Place`,
            imgType: "bronze",
            description: t`10 000 ARB`,
            key: "3",
          },
          {
            title: t`4-18 Places`,
            imgType: "other",
            description: t`1 000 ARB`,
            key: "4-18",
          },
        ];
      case "pnlPercentage":
        return [
          { title: t`1st Place`, description: t`10 000 ARB`, imgType: "gold", key: "1" },
          {
            title: t`2nd Place`,
            description: t`7 000 ARB`,
            imgType: "silver",
            key: "2",
          },
          {
            title: t`3rd Place`,
            imgType: "bronze",
            description: t`5 000 ARB`,
            key: "3",
          },
          {
            title: t`4-18 Places`,
            imgType: "other",
            description: t`1 200 ARB`,
            key: "4-18",
          },
        ];

      default:
        throw mustNeverExist(competitionType);
    }
  }, [competitionType, leaderboardPageKey]);

  return (
    <div className="CompetitionPrizes">
      {prizes.map((prize) => (
        <CompetitionPrize prize={prize} key={prize.key} />
      ))}
    </div>
  );
}

function CompetitionPrize({ prize }: { prize: Prize }) {
  return (
    <div className="CompetitionPrizes__prize">
      <img className="CompetitionPrizes__prize-icon" src={iconByType[prize.imgType]} />
      <div className="CompetitionPrizes__prize-text">
        <div className="CompetitionPrizes__prize-title">{prize.title}</div>
        <div className="CompetitionPrizes__prize-description">{prize.description}</div>
      </div>
    </div>
  );
}
