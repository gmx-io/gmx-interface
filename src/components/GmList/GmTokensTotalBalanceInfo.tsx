import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo } from "react";

import { MultichainMarketTokenBalances } from "domain/multichain/types";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { UserEarningsData } from "domain/synthetics/markets";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { convertToUsd } from "domain/synthetics/tokens";
import { ProgressiveTokenData } from "domain/tokens";
import { formatBalanceAmount, formatDeltaUsd, formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import { MultichainBalanceTooltip } from "components/MultichainBalanceTooltip/MultichainBalanceTooltip";
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
}: {
  token: ProgressiveTokenData | undefined;
  earnedTotal?: bigint;
  earnedRecently?: bigint;
  daysConsidered: number;
  multichainBalances: MultichainMarketTokenBalances | undefined;
  isGlv?: boolean;
  singleLine?: boolean;
}) => {
  const balance = multichainBalances?.totalBalance ?? 0n;

  const content =
    token && balance !== 0n ? (
      <TokenValuesInfoCell
        value={formatBalanceAmount(balance, token.decimals)}
        usd={
          balance !== 0n
            ? formatUsd(convertToUsd(balance, token.decimals, token.prices?.minPrice), {
                fallbackToZero: true,
              })
            : undefined
        }
        symbol={token.symbol}
        singleLine={singleLine}
      />
    ) : (
      <span>-</span>
    );

  const symbol = isGlv ? "GLV" : "GM";
  const multichainBalanceTooltip = useMemo(
    () => (
      <MultichainBalanceTooltip multichainBalances={multichainBalances} symbol={symbol} decimals={token?.decimals} />
    ),
    [multichainBalances, symbol, token?.decimals]
  );

  const hasChainBalances = multichainBalanceTooltip !== null;
  const hasFees = earnedTotal !== undefined || earnedRecently !== undefined;

  const tooltipContent = useMemo(() => {
    if (!hasFees && !hasChainBalances) {
      return null;
    }

    return (
      <>
        {multichainBalanceTooltip}
        {earnedTotal !== undefined && (
          <StatsTooltipRow
            showDollar={false}
            label={t`Total Earned Fees`}
            textClassName={getPositiveOrNegativeClass(earnedTotal)}
            value={formatDeltaUsd(earnedTotal, undefined)}
            valueClassName="numbers"
          />
        )}
        {earnedRecently !== undefined && (
          <StatsTooltipRow
            showDollar={false}
            textClassName={getPositiveOrNegativeClass(earnedRecently)}
            label={t`${daysConsidered}d Earned Fees`}
            value={formatDeltaUsd(earnedRecently, undefined)}
            valueClassName="numbers"
          />
        )}
        {hasFees && (
          <>
            <br />
            <div className="text-typography-primary">
              <Trans>
                The fees' USD value is calculated at the time they are earned and does not include incentives.
              </Trans>
            </div>
          </>
        )}
      </>
    );
  }, [daysConsidered, earnedRecently, earnedTotal, hasChainBalances, hasFees, multichainBalanceTooltip]);

  if (!hasFees && !hasChainBalances) {
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
  tooltipPosition,
  label,
}: {
  balance?: bigint;
  balanceUsd?: bigint;
  userEarnings: UserEarningsData | null;
  tooltipPosition?: TooltipPosition;
  label: string;
}) => {
  const shouldShowIncentivesNote = useLpIncentivesIsActive();
  const daysConsidered = useDaysConsideredInMarketsApr();

  const renderTooltipContent = useCallback(() => {
    return (
      <>
        <StatsTooltipRow
          label={t`Wallet`}
          value={<AmountWithUsdBalance amount={balance} decimals={18} symbol="GM" usd={balanceUsd} usdAsPrimary />}
          showDollar={false}
        />
        {userEarnings && (
          <>
            <StatsTooltipRow
              label={t`Total Earned Fees`}
              textClassName={getPositiveOrNegativeClass(userEarnings.allMarkets.total)}
              value={formatDeltaUsd(userEarnings.allMarkets.total, undefined, { showPlusForZero: true })}
              valueClassName="numbers"
              showDollar={false}
            />
            <StatsTooltipRow
              label={t`${daysConsidered}d Earned Fees`}
              textClassName={getPositiveOrNegativeClass(userEarnings.allMarkets.recent)}
              value={formatDeltaUsd(userEarnings.allMarkets.recent, undefined, { showPlusForZero: true })}
              valueClassName="numbers"
              showDollar={false}
            />
            {userEarnings.allMarkets.expected365d > 0 && (
              <>
                <StatsTooltipRow
                  label={t`365d Est. Fees`}
                  textClassName={getPositiveOrNegativeClass(userEarnings.allMarkets.expected365d)}
                  value={formatDeltaUsd(userEarnings.allMarkets.expected365d, undefined, { showPlusForZero: true })}
                  valueClassName="numbers"
                  showDollar={false}
                />
                <br />
                <div className="text-typography-primary">
                  <Trans>The 365d estimate is based on the past {daysConsidered}d APY.</Trans>
                </div>
                {shouldShowIncentivesNote && (
                  <>
                    <br />
                    <div className="text-typography-primary">
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
  }, [balance, balanceUsd, daysConsidered, shouldShowIncentivesNote, userEarnings]);

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
