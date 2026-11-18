import { t, Trans } from "@lingui/macro";
import { ReactNode } from "react";
import Skeleton from "react-loading-skeleton";

import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import StandardTooltip from "components/Tooltip/StandardTooltip";

import InfoIcon from "img/ic_info_circle_stroke.svg?react";

import { formatCountdown, formatGt, formatGtPrice, formatUsdc } from "../gtPointsFormat";
import type { GtBuybackPool, GtBuybackSeason } from "../gtPointsTypes";
import { useNowSeconds } from "./useNowSeconds";

function InfoLabel({ label, tooltip }: { label: ReactNode; tooltip: ReactNode }) {
  return <StandardTooltip variant="iconStroke" handle={label} content={tooltip} />;
}

function Value({ children, isLoading }: { children: ReactNode; isLoading: boolean }) {
  return isLoading ? (
    <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={80} />
  ) : (
    <span className="numbers">{children}</span>
  );
}

export function BuybackPoolCard({
  pool,
  season,
  isLoading,
}: {
  pool: GtBuybackPool | undefined;
  season: GtBuybackSeason | undefined;
  isLoading: boolean;
}) {
  const now = useNowSeconds(pool !== undefined || season !== undefined);
  const notStarted = season !== undefined && now < season.startsAt;
  const empty = notStarted ? "–" : "N/A";

  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <h3 className="text-body-large p-20 pb-16 font-medium text-typography-primary">
        <Trans>Next buyback</Trans>
      </h3>
      <div className="border-t-1/2 border-slate-600" />
      <div className="flex flex-col gap-12 p-20">
        <SyntheticsInfoRow
          label={
            <InfoLabel
              label={<Trans>Max buyback value</Trans>}
              tooltip={t`USDC the next buyback can spend. It comes from Solana protocol fees.`}
            />
          }
          value={<Value isLoading={isLoading}>{pool ? formatUsdc(pool.maxBuybackUsd) : empty}</Value>}
        />
        <SyntheticsInfoRow
          label={
            <InfoLabel
              label={<Trans>GT submitted for sale</Trans>}
              tooltip={t`All GT that sellers have submitted to the next buyback so far`}
            />
          }
          value={<Value isLoading={isLoading}>{pool ? formatGt(pool.queuedGt) : empty}</Value>}
        />
        <SyntheticsInfoRow
          label={
            <InfoLabel
              label={<Trans>Est. buyback price</Trans>}
              tooltip={t`Max buyback value divided by the GT submitted, never above the current minting price. It drops if more GT is submitted before the buyback.`}
            />
          }
          value={<Value isLoading={isLoading}>{pool ? formatGtPrice(pool.estPriceUsd) : empty}</Value>}
        />
        <SyntheticsInfoRow
          label={<Trans>Next buyback in</Trans>}
          value={
            <Value isLoading={isLoading}>
              {pool ? (
                formatCountdown(pool.nextBuybackAt - now)
              ) : notStarted ? (
                <Trans>After the season starts</Trans>
              ) : (
                empty
              )}
            </Value>
          }
        />
      </div>
    </div>
  );
}

export function MyParticipationCard({
  participation,
  isConnected,
  isLoading,
}: {
  participation: { queuedGt: bigint; estProceedsUsd: bigint } | undefined;
  isConnected: boolean;
  isLoading: boolean;
}) {
  const empty = isConnected && !isLoading ? "N/A" : "–";

  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <h3 className="text-body-large p-20 pb-16 font-medium text-typography-primary">
        <Trans>My participation</Trans>
      </h3>
      <div className="border-t-1/2 border-slate-600" />
      <div className="flex grow flex-col gap-12 p-20">
        <SyntheticsInfoRow
          label={<Trans>My GT submitted</Trans>}
          value={<Value isLoading={isLoading}>{participation ? formatGt(participation.queuedGt) : empty}</Value>}
        />
        <SyntheticsInfoRow
          label={
            <InfoLabel
              label={<Trans>Est. proceeds</Trans>}
              tooltip={t`Your GT submitted times the estimated buyback price. The final amount is set at the buyback.`}
            />
          }
          value={
            <Value isLoading={isLoading}>{participation ? formatUsdc(participation.estProceedsUsd) : empty}</Value>
          }
        />
        <div className="text-body-small mt-auto flex items-start gap-6 pt-4 text-typography-secondary">
          <InfoIcon className="mt-1 size-14 shrink-0" />
          <Trans>Proceeds are sent to your wallet in USDC within 24 hours after the buyback</Trans>
        </div>
      </div>
    </div>
  );
}
