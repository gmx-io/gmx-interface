import { t } from "@lingui/macro";
import { CompetitionType } from "domain/synthetics/leaderboard";
import { mustNeverExist } from "lib/types";
import { useMemo } from "react";
import goldIcon from "img/leaderboard_gold.svg";

type Prize = {
  title: string;
  description: string;
  imgType: "gold" | "silver" | "bronze" | "winner";
  key: string;
};

export function CompetitionPrizes({ competition }: { competition: CompetitionType }) {
  const prizes: Prize[] = useMemo(() => {
    switch (competition) {
      case "notionalPnl":
      case "pnlPercentage":
        return [
          { title: t`1st Place`, description: t`50000 ARB tokens`, imgType: "gold", key: "1" },
          {
            title: t`2nd Place`,
            description: t`30000 ARB tokens`,
            imgType: "silver",
            key: "2",
          },
          {
            title: t`3rd Place`,
            imgType: "bronze",
            description: t`20000 ARB tokens`,
            key: "3",
          },
          {
            title: t`4-12 Places`,
            imgType: "winner",
            description: t`10000 ARB tokens`,
            key: "4-12",
          },
        ];
      default:
        throw mustNeverExist(competition);
    }
  }, [competition]);

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
    <div className="CompetitionsPrizes__prize">
      <img className="CompetitionPrizes__prize-icon" src={goldIcon} />
      <div className="CompetitionPrizes__prize-title">{prize.title}</div>
      <div className="CompetitionPrizes__prize-description">{prize.description}</div>
    </div>
  );
}
