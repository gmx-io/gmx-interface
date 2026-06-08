import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { getPlatformTokenBalanceAfterThreshold } from "domain/multichain/getPlatformTokenBalanceAfterThreshold";
import { MultichainMarketTokenBalances } from "domain/multichain/types";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { UserEarningsData } from "domain/synthetics/markets";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { ProgressiveTokenData } from "domain/tokens";
import { formatBalanceAmount, formatDeltaUsd, formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import { EarningUnavailableNote, EarningValue } from "components/EarningValue/EarningValue";
import {
  MultichainBalanceTooltip,
  useHasMultichainBreakdown,
} from "components/MultichainBalanceTooltip/MultichainBalanceTooltip";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TooltipPosition } from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { TokenValuesInfoCell } from "./TokenValuesInfoCell";

export const GmTokensBalanceInfo = ({
  token,
  earnedTotal,
  earnedRecently,
  daysConsidered,
  multichainBalances,
  isGlv = false,
  singleLine = false,
  isMultichainBalancesLoading = false,
  isUserEarningsLoading = false,
  isUserEarningsUnavailable = false,
}: {
  token: ProgressiveTokenData | undefined;
  earnedTotal?: bigint;
  earnedRecently?: bigint;
  daysConsidered: number;
  multichainBalances: MultichainMarketTokenBalances | undefined;
  isGlv?: boolean;
  singleLine?: boolean;
  isMultichainBalancesLoading?: boolean;
  isUserEarningsLoading?: boolean;
  isUserEarningsUnavailable?: boolean;
}) => {
  const balance = multichainBalances?.totalBalance ?? 0n;
  const balanceUsd = getPlatformTokenBalanceAfterThreshold(multichainBalances?.totalBalanceUsd);

  const content =
    token && balance !== 0n ? (
      <TokenValuesInfoCell
        value={formatBalanceAmount(balance, token.decimals)}
        usd={balanceUsd !== 0n ? formatUsd(balanceUsd) : "..."}
        symbol={token.symbol}
        singleLine={singleLine}
        isLoading={isMultichainBalancesLoading}
      />
    ) : (
      <span>-</span>
    );

  const symbol = isGlv ? "GLV" : "GM";
  const hasChainBalances = useHasMultichainBreakdown(multichainBalances);
  const multichainBalanceTooltip = useMemo(() => {
    if (!hasChainBalances || balanceUsd === 0n) {
      return null;
    }

    return (
      <MultichainBalanceTooltip multichainBalances={multichainBalances} symbol={symbol} decimals={token?.decimals} />
    );
  }, [hasChainBalances, balanceUsd, multichainBalances, symbol, token?.decimals]);
  const hasFees = earnedTotal !== undefined || earnedRecently !== undefined;
  const shouldShowFeesLoading = !isGlv && isUserEarningsLoading && balance !== 0n;
  const shouldShowFeesUnavailable = !isGlv && isUserEarningsUnavailable && balance !== 0n;
  const shouldShowFeeRows = hasFees || shouldShowFeesLoading || shouldShowFeesUnavailable;

  const tooltipContent = useMemo(() => {
    if (!shouldShowFeeRows && !hasChainBalances) {
      return null;
    }

    return (
      <>
        {multichainBalanceTooltip}
        {shouldShowFeeRows && (
          <StatsTooltipRow
            showDollar={false}
            label={t`Total earned fees`}
            textClassName={earnedTotal !== undefined ? getPositiveOrNegativeClass(earnedTotal) : undefined}
            value={
              <EarningValue
                value={earnedTotal}
                isLoading={earnedTotal === undefined && shouldShowFeesLoading}
                isAvailable={earnedTotal !== undefined || !shouldShowFeesUnavailable}
              >
                {(value) => formatDeltaUsd(value, undefined)}
              </EarningValue>
            }
            valueClassName="numbers"
          />
        )}
        {shouldShowFeeRows && (
          <StatsTooltipRow
            showDollar={false}
            textClassName={earnedRecently !== undefined ? getPositiveOrNegativeClass(earnedRecently) : undefined}
            label={t`${daysConsidered}d earned fees`}
            value={
              <EarningValue
                value={earnedRecently}
                isLoading={earnedRecently === undefined && shouldShowFeesLoading}
                isAvailable={earnedRecently !== undefined || !shouldShowFeesUnavailable}
              >
                {(value) => formatDeltaUsd(value, undefined)}
              </EarningValue>
            }
            valueClassName="numbers"
          />
        )}
        {shouldShowFeesUnavailable && (
          <>
            <br />
            <EarningUnavailableNote />
          </>
        )}
        {hasFees && (
          <>
            <br />
            <div className="text-typography-primary">
              <Trans>Fee values calculated when earned. Excludes incentives.</Trans>
            </div>
          </>
        )}
      </>
    );
  }, [
    daysConsidered,
    earnedRecently,
    earnedTotal,
    hasChainBalances,
    hasFees,
    multichainBalanceTooltip,
    shouldShowFeeRows,
    shouldShowFeesLoading,
    shouldShowFeesUnavailable,
  ]);

  if (!shouldShowFeeRows && !hasChainBalances) {
    return content;
  }

  return (
    <TooltipWithPortal
      content={tooltipContent}
      handle={content}
      handleClassName="!inline-block"
      position="bottom-end"
    />
  );
};

export const GmTokensTotalBalanceInfo = ({
  balance,
  balanceUsd,
  userEarnings,
  isUserEarningsLoading = false,
  isUserEarningsUnavailable = false,
  isEstimated365dFeesLoading = false,
  isEstimated365dFeesUnavailable = false,
  tooltipPosition,
  label,
}: {
  balance?: bigint;
  balanceUsd?: bigint;
  userEarnings: UserEarningsData | null;
  isUserEarningsLoading?: boolean;
  isUserEarningsUnavailable?: boolean;
  isEstimated365dFeesLoading?: boolean;
  isEstimated365dFeesUnavailable?: boolean;
  tooltipPosition?: TooltipPosition;
  label: string;
}) => {
  const shouldShowIncentivesNote = useLpIncentivesIsActive();
  const daysConsidered = useDaysConsideredInMarketsApr();
  const shouldShowEarningsFallback = !userEarnings && (isUserEarningsLoading || isUserEarningsUnavailable);
  const shouldShowEarningsRows = Boolean(userEarnings) || shouldShowEarningsFallback;
  const isEarningsLoading = !userEarnings && isUserEarningsLoading;
  const areEarningsAvailable = Boolean(userEarnings) || !isUserEarningsUnavailable;
  const hasGmBalance = balance !== undefined && balance > 0n;
  const shouldShowEstimated365dFees =
    (userEarnings !== null && userEarnings.allMarkets.expected365d > 0n) ||
    shouldShowEarningsFallback ||
    (hasGmBalance && (isEstimated365dFeesLoading || isEstimated365dFeesUnavailable));
  const isEstimated365dFeesValueLoading = isEarningsLoading || isEstimated365dFeesLoading;
  const areEstimated365dFeesAvailable = areEarningsAvailable && !isEstimated365dFeesUnavailable;

  const renderTooltipContent = useCallback(() => {
    return (
      <>
        <StatsTooltipRow
          label={t`Wallet`}
          value={<AmountWithUsdBalance amount={balance} decimals={18} symbol="GM" usd={balanceUsd} usdAsPrimary />}
          showDollar={false}
        />
        {shouldShowEarningsRows && (
          <>
            <StatsTooltipRow
              label={t`Total earned fees`}
              textClassName={
                userEarnings !== null ? getPositiveOrNegativeClass(userEarnings.allMarkets.total) : undefined
              }
              value={
                <EarningValue
                  value={userEarnings?.allMarkets.total}
                  isLoading={isEarningsLoading}
                  isAvailable={areEarningsAvailable}
                >
                  {(value) => formatDeltaUsd(value, undefined, { showPlusForZero: true })}
                </EarningValue>
              }
              valueClassName="numbers"
              showDollar={false}
            />
            <StatsTooltipRow
              label={t`${daysConsidered}d earned fees`}
              textClassName={
                userEarnings !== null ? getPositiveOrNegativeClass(userEarnings.allMarkets.recent) : undefined
              }
              value={
                <EarningValue
                  value={userEarnings?.allMarkets.recent}
                  isLoading={isEarningsLoading}
                  isAvailable={areEarningsAvailable}
                >
                  {(value) => formatDeltaUsd(value, undefined, { showPlusForZero: true })}
                </EarningValue>
              }
              valueClassName="numbers"
              showDollar={false}
            />
            {shouldShowEstimated365dFees && (
              <>
                <StatsTooltipRow
                  label={t`365d estimated fees`}
                  textClassName={
                    userEarnings !== null ? getPositiveOrNegativeClass(userEarnings.allMarkets.expected365d) : undefined
                  }
                  value={
                    <EarningValue
                      value={userEarnings?.allMarkets.expected365d}
                      isLoading={isEstimated365dFeesValueLoading}
                      isAvailable={areEstimated365dFeesAvailable}
                    >
                      {(value) => formatDeltaUsd(value, undefined, { showPlusForZero: true })}
                    </EarningValue>
                  }
                  valueClassName="numbers"
                  showDollar={false}
                />
                {userEarnings !== null &&
                  userEarnings.allMarkets.expected365d > 0n &&
                  areEstimated365dFeesAvailable && (
                    <>
                      <br />
                      <div className="text-typography-primary">
                        <Trans>Projected from last {daysConsidered} days' APY</Trans>
                      </div>
                      {shouldShowIncentivesNote && (
                        <>
                          <br />
                          <div className="text-typography-primary">
                            <Trans>Excludes incentives</Trans>
                          </div>
                        </>
                      )}
                    </>
                  )}
              </>
            )}
            {isUserEarningsUnavailable && (
              <>
                <br />
                <EarningUnavailableNote />
              </>
            )}
          </>
        )}
      </>
    );
  }, [
    balance,
    balanceUsd,
    areEarningsAvailable,
    areEstimated365dFeesAvailable,
    daysConsidered,
    isEarningsLoading,
    isEstimated365dFeesValueLoading,
    isUserEarningsUnavailable,
    shouldShowEarningsRows,
    shouldShowEstimated365dFees,
    shouldShowIncentivesNote,
    userEarnings,
  ]);

  return balance !== undefined && balanceUsd !== undefined ? (
    <TooltipWithPortal
      handle={label}
      className="normal-case"
      handleClassName="!block"
      maxAllowedWidth={340}
      position={tooltipPosition ?? "bottom-end"}
      renderContent={renderTooltipContent}
      variant="iconStroke"
    />
  ) : (
    <>{label}</>
  );
};

function useLpIncentivesIsActive() {
  return useIncentiveStats()?.lp?.isActive ?? false;
}
