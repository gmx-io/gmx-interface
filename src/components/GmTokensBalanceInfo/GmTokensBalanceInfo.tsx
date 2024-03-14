import { Trans, t } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip, { TooltipPosition } from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { UserEarningsData } from "domain/synthetics/markets";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { TokenData, convertToUsd } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { formatDeltaUsd, formatTokenAmount, formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";
import { useCallback, useMemo } from "react";

export const GmTokensBalanceInfo = ({
  token,
  earnedTotal,
  earnedRecently,
  daysConsidered,
  oneLine = false,
}: {
  token: TokenData;
  earnedTotal?: BigNumber;
  earnedRecently?: BigNumber;
  daysConsidered: number;
  oneLine?: boolean;
}) => {
  const content = (
    <>
      {formatTokenAmount(token.balance, token.decimals, "GM", {
        useCommas: true,
        displayDecimals: 2,
        fallbackToZero: true,
      })}
      {oneLine ? " " : <br />}(
      {formatUsd(convertToUsd(token.balance, token.decimals, token.prices?.minPrice), {
        fallbackToZero: true,
      })}
      )
    </>
  );

  const renderTooltipContent = useCallback(() => {
    if (!earnedTotal && !earnedRecently) return null;
    return (
      <>
        {earnedTotal && (
          <StatsTooltipRow
            showDollar={false}
            label={t`Total accrued Fees`}
            className={getPositiveOrNegativeClass(earnedTotal)}
            value={formatDeltaUsd(earnedTotal, undefined)}
          />
        )}
        {earnedRecently && (
          <StatsTooltipRow
            showDollar={false}
            className={getPositiveOrNegativeClass(earnedRecently)}
            label={t`${daysConsidered}d accrued Fees`}
            value={formatDeltaUsd(earnedRecently, undefined)}
          />
        )}
        <br />
        <div className="text-white">
          <Trans>The fees' USD value is calculated at the time they are accrued and does not include incentives.</Trans>
        </div>
      </>
    );
  }, [daysConsidered, earnedRecently, earnedTotal]);
  if (!earnedTotal && !earnedRecently) {
    return content;
  }

  return <TooltipWithPortal renderContent={renderTooltipContent} handle={content} position="bottom-end" />;
};

export const GmTokensTotalBalanceInfo = ({
  balance,
  balanceUsd,
  userEarnings,
  tooltipPosition,
  label,
}: {
  balance?: BigNumber;
  balanceUsd?: BigNumber;
  userEarnings: UserEarningsData | null;
  tooltipPosition?: TooltipPosition;
  label: string;
}) => {
  const shouldShowIncentivesNote = useLpIncentivesIsActive();
  const daysConsidered = useDaysConsideredInMarketsApr();
  const walletTotalValue = useMemo(
    () => [
      formatTokenAmount(balance, 18, "GM", {
        useCommas: true,
        fallbackToZero: true,
      }),
      `(${formatUsd(balanceUsd)})`,
    ],
    [balance, balanceUsd]
  );

  const renderTooltipContent = useCallback(() => {
    return (
      <>
        <StatsTooltipRow label={t`Wallet total`} value={walletTotalValue} showDollar={false} />
        {userEarnings && (
          <>
            <StatsTooltipRow
              label={t`Wallet total accrued Fees`}
              className={getPositiveOrNegativeClass(userEarnings.allMarkets.total)}
              value={formatDeltaUsd(userEarnings.allMarkets.total, undefined, { showPlusForZero: true })}
              showDollar={false}
            />
            <StatsTooltipRow
              label={t`Wallet ${daysConsidered}d accrued Fees `}
              className={getPositiveOrNegativeClass(userEarnings.allMarkets.recent)}
              value={formatDeltaUsd(userEarnings.allMarkets.recent, undefined, { showPlusForZero: true })}
              showDollar={false}
            />
            {userEarnings.allMarkets.expected365d.gt(0) && (
              <>
                <StatsTooltipRow
                  label={t`Wallet 365d expected Fees`}
                  className={getPositiveOrNegativeClass(userEarnings.allMarkets.expected365d)}
                  value={formatDeltaUsd(userEarnings.allMarkets.expected365d, undefined, { showPlusForZero: true })}
                  showDollar={false}
                />
                <br />
                <div className="text-white">
                  <Trans>Expected 365d Fees are projected based on past {daysConsidered}d base APR.</Trans>
                </div>
                {shouldShowIncentivesNote && (
                  <>
                    <br />
                    <div className="text-white">
                      <Trans>Fee values do not include incentives.</Trans>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </>
    );
  }, [daysConsidered, shouldShowIncentivesNote, userEarnings, walletTotalValue]);

  return balance && balanceUsd ? (
    <Tooltip
      handle={label}
      className="text-none"
      maxAllowedWidth={340}
      position={tooltipPosition ?? "bottom-end"}
      renderContent={renderTooltipContent}
    />
  ) : (
    <>{label}</>
  );
};

function useLpIncentivesIsActive() {
  return useIncentiveStats()?.lp?.isActive ?? false;
}
