import { t, Trans } from "@lingui/macro";
import { Link } from "react-router-dom";

import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { formatDate } from "lib/dates";

import Button from "components/Button/Button";
import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";
import ConnectWalletPlaceholder from "components/ConnectWalletButton/ConnectWalletPlaceholder";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";

import { GtMetric } from "../GtMetric";
import { formatGt } from "../gtPointsFormat";
import type { GtBuybackSeason, GtSellableQuota } from "../gtPointsTypes";
import { useNowSeconds } from "./useNowSeconds";

export const REFERRALS_AFFILIATES_PATH = "/referrals/affiliates";

type Props = {
  quota: GtSellableQuota | undefined;
  isConnected: boolean;
  isLoading: boolean;
  /** Selling is closed until the season starts */
  season: GtBuybackSeason | undefined;
  onSell: () => void;
};

export function SellableQuotaCard({ quota, isConnected, isLoading, season, onSell }: Props) {
  const { openConnectModal } = useConnectModal();
  const now = useNowSeconds(season !== undefined && isConnected);
  const closedReason =
    season && now < season.startsAt
      ? t`Selling opens when ${season.name} starts on ${formatDate(season.startsAt)}`
      : undefined;
  const isUnavailable = isConnected && !isLoading && !quota;
  const cantSellReason =
    closedReason ?? (quota && quota.availableToSell === 0n ? t`You have no GT to sell right now` : undefined);

  const sellButton = (
    <Button variant="primary" disabled={!quota || cantSellReason !== undefined} onClick={onSell}>
      <Trans>Sell GT</Trans>
    </Button>
  );

  const value = (amount: bigint | undefined) =>
    amount === undefined ? (isUnavailable ? "N/A" : "–") : formatGt(amount);

  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <div className="flex items-center justify-between gap-12 p-20 pb-16">
        <h3 className="text-body-large font-medium text-typography-primary">
          <Trans>My sellable GT</Trans>
        </h3>
        {!isConnected ? null : cantSellReason && quota ? (
          <TooltipWithPortal variant="none" isHandlerDisabled handle={sellButton} content={cantSellReason} />
        ) : (
          sellButton
        )}
      </div>

      <div className="border-t-1/2 border-slate-600" />

      {!isConnected && isLoading ? (
        <div className="flex justify-end p-20">
          <ConnectWalletPlaceholder />
        </div>
      ) : !isConnected ? (
        <div className="flex flex-wrap items-center justify-between gap-12 p-20">
          <span className="text-body-medium text-typography-secondary">
            <Trans>Connect your wallet to see your sellable GT and sell it in the buyback.</Trans>
          </span>
          {openConnectModal && (
            <ConnectWalletButton onClick={openConnectModal}>
              <Trans>Connect wallet</Trans>
            </ConnectWalletButton>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-x-32 gap-y-20 p-20 max-md:grid-cols-1">
            <GtMetric
              label={<Trans>Earned quota</Trans>}
              tooltip={
                <Trans>
                  How much GT you can sell this season. You earn quota when the traders you refer use GMX on Solana.
                </Trans>
              }
              isLoading={isLoading}
              value={value(quota?.earned)}
              valueClassName="!text-body-large font-medium"
            />
            <GtMetric
              label={<Trans>Remaining quota</Trans>}
              tooltip={<Trans>Earned quota you haven't used yet. Each sale uses part of it.</Trans>}
              isLoading={isLoading}
              value={value(quota?.remaining)}
              valueClassName="!text-body-large font-medium"
            />
            <GtMetric
              label={<Trans>Available to sell now</Trans>}
              tooltip={<Trans>GT you can sell in the next buyback: your remaining quota, up to the GT you hold.</Trans>}
              isLoading={isLoading}
              value={value(quota?.availableToSell)}
              valueClassName="!text-body-large font-medium"
            />
          </div>

          <div className="border-t-1/2 border-slate-600" />

          <div className="flex flex-wrap items-center justify-between gap-8 px-20 py-14">
            <span className="text-body-small text-typography-secondary">
              <Trans>Refer traders to earn more quota.</Trans>
            </span>
            <Link
              to={REFERRALS_AFFILIATES_PATH}
              className="text-body-small inline-flex items-center gap-4 font-medium text-typography-secondary hover:text-typography-primary"
            >
              {quota?.hasReferralCode ? <Trans>Affiliate dashboard</Trans> : <Trans>Create referral code</Trans>}
              <ArrowRightIcon className="size-14" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
