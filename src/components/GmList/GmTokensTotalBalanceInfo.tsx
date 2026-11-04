import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { getPlatformTokenBalanceAfterThreshold } from "domain/multichain/getPlatformTokenBalanceAfterThreshold";
import { MultichainMarketTokenBalances } from "domain/multichain/types";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { UserEarningsData } from "domain/synthetics/markets";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { ProgressiveTokenData } from "domain/tokens";
import { formatBalanceAmount } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import { EarningAttributionNote, EarningUnavailableNote, EarningValue } from "components/EarningValue/EarningValue";
import {
  MultichainBalanceTooltip,
  useHasMultichainBreakdown,
} from "components/MultichainBalanceTooltip/MultichainBalanceTooltip";
import { DeltaUsdValue } from "components/NumericValue/DeltaUsdValue";
import { UsdValue } from "components/NumericValue/UsdValue";
import StandardTooltip, { type StandardTooltipPosition } from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipFootnote, TooltipRow } from "components/Tooltip/TooltipBlocks";

import { TokenValuesInfoCell } from "./TokenValuesInfoCell";

export const GmTokensBalanceInfo = ({
  token,
  earnedTotal,
  earnedRecently,
  earnedExpected365d,
  daysConsidered,
  multichainBalances,
  isGlv = false,
  singleLine = false,
  isMultichainBalancesLoading = false,
  isUserEarningsLoading = false,
  isUserEarningsUnavailable = false,
  isEstimated365dFeesLoading = false,
  isEstimated365dFeesUnavailable = false,
  hasBalanceOutsideWallet = false,
}: {
  token: ProgressiveTokenData | undefined;
  earnedTotal?: bigint;
  earnedRecently?: bigint;
  earnedExpected365d?: bigint;
  daysConsidered: number;
  multichainBalances: MultichainMarketTokenBalances | undefined;
  isGlv?: boolean;
  singleLine?: boolean;
  isMultichainBalancesLoading?: boolean;
  isUserEarningsLoading?: boolean;
  isUserEarningsUnavailable?: boolean;
  isEstimated365dFeesLoading?: boolean;
  isEstimated365dFeesUnavailable?: boolean;
  hasBalanceOutsideWallet?: boolean;
}) => {
  const balance = multichainBalances?.totalBalance ?? 0n;
  const balanceUsd = getPlatformTokenBalanceAfterThreshold(multichainBalances?.totalBalanceUsd);

  const content =
    token && balance !== 0n ? (
      <TokenValuesInfoCell
        value={formatBalanceAmount(balance, token.decimals)}
        usd={balanceUsd !== 0n ? <UsdValue usd={balanceUsd} /> : "..."}
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
  const hasEarnedFees = earnedTotal !== undefined || earnedRecently !== undefined;
  const hasEstimated365dFees = earnedExpected365d !== undefined && earnedExpected365d > 0n;
  const shouldShowFeesLoading = !isGlv && isUserEarningsLoading && balance !== 0n;
  const shouldShowFeesUnavailable = !isGlv && isUserEarningsUnavailable && balance !== 0n;
  const shouldShowFeesUnattributed = !isGlv && hasBalanceOutsideWallet && balance !== 0n;
  const shouldShowEarnedFeeRows =
    hasEarnedFees || shouldShowFeesLoading || shouldShowFeesUnavailable || shouldShowFeesUnattributed;
  const shouldShowEstimated365dFeesLoading =
    !isGlv && balance !== 0n && (shouldShowFeesLoading || isEstimated365dFeesLoading);
  const shouldShowEstimated365dFeesUnavailable =
    !isGlv && balance !== 0n && (shouldShowFeesUnavailable || isEstimated365dFeesUnavailable);
  const shouldShowEstimated365dFeeRow =
    hasEstimated365dFees || shouldShowEstimated365dFeesLoading || shouldShowEstimated365dFeesUnavailable;
  const shouldShowFeeRows = shouldShowEarnedFeeRows || shouldShowEstimated365dFeeRow;

  const tooltipContent = useMemo(() => {
    if (!shouldShowFeeRows && !hasChainBalances) {
      return null;
    }

    return (
      <TooltipContent>
        {multichainBalanceTooltip}
        {shouldShowEarnedFeeRows && (
          <TooltipRow
            label={t`Total earned fees`}
            valueClassName={
              earnedTotal !== undefined && !shouldShowFeesUnattributed
                ? getPositiveOrNegativeClass(earnedTotal)
                : undefined
            }
            value={
              <EarningValue
                value={earnedTotal}
                isLoading={!shouldShowFeesUnattributed && earnedTotal === undefined && shouldShowFeesLoading}
                isAvailable={!shouldShowFeesUnattributed && (earnedTotal !== undefined || !shouldShowFeesUnavailable)}
              >
                {(value) => <DeltaUsdValue deltaUsd={value} />}
              </EarningValue>
            }
          />
        )}
        {shouldShowEarnedFeeRows && (
          <TooltipRow
            valueClassName={
              earnedRecently !== undefined && !shouldShowFeesUnattributed
                ? getPositiveOrNegativeClass(earnedRecently)
                : undefined
            }
            label={t`${daysConsidered}d earned fees`}
            value={
              <EarningValue
                value={earnedRecently}
                isLoading={!shouldShowFeesUnattributed && earnedRecently === undefined && shouldShowFeesLoading}
                isAvailable={
                  !shouldShowFeesUnattributed && (earnedRecently !== undefined || !shouldShowFeesUnavailable)
                }
              >
                {(value) => <DeltaUsdValue deltaUsd={value} />}
              </EarningValue>
            }
          />
        )}
        {shouldShowEstimated365dFeeRow && (
          <TooltipRow
            valueClassName={
              earnedExpected365d !== undefined ? getPositiveOrNegativeClass(earnedExpected365d) : undefined
            }
            label={t`365d estimated fees`}
            value={
              <EarningValue
                value={earnedExpected365d}
                isLoading={shouldShowEstimated365dFeesLoading}
                isAvailable={!shouldShowEstimated365dFeesUnavailable}
              >
                {(value) => <DeltaUsdValue deltaUsd={value} />}
              </EarningValue>
            }
          />
        )}
        {(shouldShowFeesUnavailable || shouldShowEstimated365dFeesUnavailable) && (
          <TooltipFootnote>
            <EarningUnavailableNote />
          </TooltipFootnote>
        )}
        {shouldShowFeesUnattributed && (
          <TooltipFootnote>
            <EarningAttributionNote scope="gm" />
          </TooltipFootnote>
        )}
        {hasEarnedFees && !shouldShowFeesUnattributed && (
          <TooltipFootnote>
            <Trans>Fee values calculated when earned. Excludes incentives.</Trans>
          </TooltipFootnote>
        )}
        {hasEstimated365dFees && (
          <TooltipFootnote>
            <Trans>Projected from last {daysConsidered} days' APY</Trans>
          </TooltipFootnote>
        )}
      </TooltipContent>
    );
  }, [
    daysConsidered,
    earnedExpected365d,
    earnedRecently,
    earnedTotal,
    hasChainBalances,
    hasEarnedFees,
    hasEstimated365dFees,
    multichainBalanceTooltip,
    shouldShowEarnedFeeRows,
    shouldShowEstimated365dFeeRow,
    shouldShowEstimated365dFeesLoading,
    shouldShowEstimated365dFeesUnavailable,
    shouldShowFeeRows,
    shouldShowFeesLoading,
    shouldShowFeesUnattributed,
    shouldShowFeesUnavailable,
  ]);

  if (!shouldShowFeeRows && !hasChainBalances) {
    return content;
  }

  return (
    <StandardTooltip content={tooltipContent} handle={content} handleClassName="!inline-block" position="bottom-end" />
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
  hasBalanceOutsideWallet = false,
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
  hasBalanceOutsideWallet?: boolean;
  tooltipPosition?: StandardTooltipPosition;
  label: string;
}) => {
  const shouldShowIncentivesNote = useLpIncentivesIsActive();
  const daysConsidered = useDaysConsideredInMarketsApr();
  const shouldShowEarningsFallback = !userEarnings && (isUserEarningsLoading || isUserEarningsUnavailable);
  const shouldShowEarningsRows = Boolean(userEarnings) || shouldShowEarningsFallback || hasBalanceOutsideWallet;
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
      <TooltipContent>
        <TooltipRow
          label={t`Wallet`}
          value={<AmountWithUsdBalance amount={balance} decimals={18} symbol="GM" usd={balanceUsd} usdAsPrimary />}
        />
        {shouldShowEarningsRows && (
          <>
            <TooltipRow
              label={t`Total earned fees`}
              valueClassName={
                userEarnings !== null && !hasBalanceOutsideWallet
                  ? getPositiveOrNegativeClass(userEarnings.allMarkets.total)
                  : undefined
              }
              value={
                <EarningValue
                  value={userEarnings?.allMarkets.total}
                  isLoading={!hasBalanceOutsideWallet && isEarningsLoading}
                  isAvailable={!hasBalanceOutsideWallet && areEarningsAvailable}
                >
                  {(value) => <DeltaUsdValue deltaUsd={value} showPlusForZero />}
                </EarningValue>
              }
            />
            <TooltipRow
              label={t`${daysConsidered}d earned fees`}
              valueClassName={
                userEarnings !== null && !hasBalanceOutsideWallet
                  ? getPositiveOrNegativeClass(userEarnings.allMarkets.recent)
                  : undefined
              }
              value={
                <EarningValue
                  value={userEarnings?.allMarkets.recent}
                  isLoading={!hasBalanceOutsideWallet && isEarningsLoading}
                  isAvailable={!hasBalanceOutsideWallet && areEarningsAvailable}
                >
                  {(value) => <DeltaUsdValue deltaUsd={value} showPlusForZero />}
                </EarningValue>
              }
            />
            {shouldShowEstimated365dFees && (
              <>
                <TooltipRow
                  label={t`365d estimated fees`}
                  valueClassName={
                    userEarnings !== null ? getPositiveOrNegativeClass(userEarnings.allMarkets.expected365d) : undefined
                  }
                  value={
                    <EarningValue
                      value={userEarnings?.allMarkets.expected365d}
                      isLoading={isEstimated365dFeesValueLoading}
                      isAvailable={areEstimated365dFeesAvailable}
                    >
                      {(value) => <DeltaUsdValue deltaUsd={value} showPlusForZero />}
                    </EarningValue>
                  }
                />
                {userEarnings !== null &&
                  userEarnings.allMarkets.expected365d > 0n &&
                  areEstimated365dFeesAvailable && (
                    <>
                      <TooltipFootnote>
                        <Trans>Projected from last {daysConsidered} days' APY</Trans>
                      </TooltipFootnote>
                      {shouldShowIncentivesNote && (
                        <TooltipFootnote>
                          <Trans>Excludes incentives</Trans>
                        </TooltipFootnote>
                      )}
                    </>
                  )}
              </>
            )}
            {hasBalanceOutsideWallet && (
              <TooltipFootnote>
                <EarningAttributionNote scope="gm" />
              </TooltipFootnote>
            )}
            {isUserEarningsUnavailable && (
              <TooltipFootnote>
                <EarningUnavailableNote />
              </TooltipFootnote>
            )}
          </>
        )}
      </TooltipContent>
    );
  }, [
    balance,
    balanceUsd,
    areEarningsAvailable,
    areEstimated365dFeesAvailable,
    daysConsidered,
    hasBalanceOutsideWallet,
    isEarningsLoading,
    isEstimated365dFeesValueLoading,
    isUserEarningsUnavailable,
    shouldShowEarningsRows,
    shouldShowEstimated365dFees,
    shouldShowIncentivesNote,
    userEarnings,
  ]);

  return balance !== undefined && balanceUsd !== undefined ? (
    <StandardTooltip
      handle={label}
      className="normal-case"
      handleClassName="!block"
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
