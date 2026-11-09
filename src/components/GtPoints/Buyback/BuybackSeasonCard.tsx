import { Trans } from "@lingui/macro";
import Skeleton from "react-loading-skeleton";

import { formatDate } from "lib/dates";

import { formatCountdown } from "../gtPointsFormat";
import type { GtBuybackSeason } from "../gtPointsTypes";
import { useNowSeconds } from "./useNowSeconds";

export function BuybackSeasonCard({ season, isLoading }: { season: GtBuybackSeason | undefined; isLoading: boolean }) {
  const now = useNowSeconds(season !== undefined);
  const hasStarted = season ? now >= season.startsAt : false;

  return (
    <div className="flex flex-wrap items-center justify-between gap-12 rounded-8 bg-slate-900 p-20">
      <div className="flex flex-col gap-4">
        <h3 className="text-body-large font-medium text-typography-primary">
          {season ? <Trans>GT buyback {season.name}</Trans> : <Trans>GT buyback</Trans>}
        </h3>
        <span className="text-body-small text-typography-secondary numbers">
          {isLoading ? (
            <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={140} />
          ) : !season ? (
            <Trans>Season details are not available yet</Trans>
          ) : hasStarted ? (
            <Trans>Started {formatDate(season.startsAt)}</Trans>
          ) : (
            <Trans>Starts {formatDate(season.startsAt)}</Trans>
          )}
        </span>
      </div>

      {season && !isLoading ? (
        hasStarted ? (
          <span className="text-body-small inline-flex items-center gap-6 rounded-full bg-green-500/10 px-10 py-4 font-medium text-green-500">
            <span className="size-6 rounded-full bg-green-500" />
            <Trans>Active</Trans>
          </span>
        ) : (
          <span className="text-body-small inline-flex items-center gap-6 rounded-full bg-blue-300/10 px-10 py-4 font-medium text-blue-300 numbers">
            <Trans>Starts in {formatCountdown(season.startsAt - now)}</Trans>
          </span>
        )
      ) : null}
    </div>
  );
}
