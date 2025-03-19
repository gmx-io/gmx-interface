import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo } from "react";


import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { UserEarningsData } from "domain/synthetics/markets";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { TokenData, convertToUsd } from "domain/synthetics/tokens";
import { formatBalanceAmount, formatDeltaUsd, formatUsd } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TooltipPosition } from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { TokenValuesInfoCell } from "./TokenValuesInfoCell";

export const GmTokensBalanceInfo = ({
  token,
  earnedTotal,
  earnedRecently,
  daysConsidered,
  isGlv = false,
}: {
  token: TokenData;
  earnedTotal?: bigint;
  earnedRecently?: bigint;
  daysConsidered: number;
  isGlv?: boolean;
}) => {
  const content = (
    <TokenValuesInfoCell
      value={formatBalanceAmount(token.balance ?? 0n, token.decimals)}
      usd={
        token.balance !== undefined && token.balance !== 0n
          ? formatUsd(convertToUsd(token.balance, token.decimals, token.prices?.minPrice), {
              fallbackToZero: true,
            })
          : undefined
      }
      symbol={token.symbol}
    />
  );

  const tooltipContent = useMemo(() => {
    if (earnedTotal === undefined && earnedRecently === undefined) return null;
    return (
      <>
        {earnedTotal !== undefined && (
          <StatsTooltipRow
            showDollar={false}
            label={t`Total accrued Fees`}
            textClassName={getPositiveOrNegativeClass(earnedTotal)}
            value={formatDeltaUsd(earnedTotal, undefined)}
          />
        )}
        {earnedRecently !== undefined && (
          <StatsTooltipRow
            showDollar={false}
            textClassName={getPositiveOrNegativeClass(earnedRecently)}
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

  if ((earnedTotal === undefined && earnedRecently === undefined) || isGlv) {
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
          label={t`Wallet total`}
          value={<AmountWithUsdBalance multiline amount={balance} decimals={18} symbol="GM" usd={balanceUsd} />}
          showDollar={false}
        />
        {userEarnings && (
          <>
            <StatsTooltipRow
              label={t`Wallet total accrued Fees`}
              textClassName={getPositiveOrNegativeClass(userEarnings.allMarkets.total)}
              value={formatDeltaUsd(userEarnings.allMarkets.total, undefined, { showPlusForZero: true })}
              showDollar={false}
            />
            <StatsTooltipRow
              label={t`Wallet ${daysConsidered}d accrued Fees `}
              textClassName={getPositiveOrNegativeClass(userEarnings.allMarkets.recent)}
              value={formatDeltaUsd(userEarnings.allMarkets.recent, undefined, { showPlusForZero: true })}
              showDollar={false}
            />
            {userEarnings.allMarkets.expected365d > 0 && (
              <>
                <StatsTooltipRow
                  label={t`Wallet 365d expected Fees`}
                  textClassName={getPositiveOrNegativeClass(userEarnings.allMarkets.expected365d)}
                  value={formatDeltaUsd(userEarnings.allMarkets.expected365d, undefined, { showPlusForZero: true })}
                  showDollar={false}
                />
                <br />
                <div className="text-white">
                  <Trans>Expected 365d Fees are projected based on past {daysConsidered}d base APY.</Trans>
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
  }, [balance, balanceUsd, daysConsidered, shouldShowIncentivesNote, userEarnings]);

  return balance !== undefined && balanceUsd !== undefined ? (
    <TooltipWithPortal
      handle={label}
      className="normal-case"
      handleClassName="!block"
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
