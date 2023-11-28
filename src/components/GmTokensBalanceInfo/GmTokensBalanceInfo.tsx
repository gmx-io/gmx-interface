import { Trans, t } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { UserEarningsData } from "domain/synthetics/markets";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { TokenData, convertToUsd } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { formatDeltaUsd, formatTokenAmount, formatUsd } from "lib/numbers";
import { useCallback } from "react";

export const GmTokensBalanceInfo = ({
  token,
  earnedTotal,
  earnedRecently,
  daysConsidered,
  oneLine = false,
  comment,
}: {
  token: TokenData;
  earnedTotal?: BigNumber;
  earnedRecently?: BigNumber;
  daysConsidered: number;
  oneLine?: boolean;
  comment?: string;
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
            className={getColorByValue(earnedTotal)}
            value={`${formatDeltaUsd(earnedTotal, undefined, { showPlusForZero: true })}`}
          />
        )}
        {earnedRecently && (
          <StatsTooltipRow
            showDollar={false}
            className={getColorByValue(earnedRecently)}
            label={t`${daysConsidered}d accrued Fees`}
            value={`${formatDeltaUsd(earnedRecently, undefined, { showPlusForZero: true })}`}
          />
        )}
        <br />
        <div title={comment}>
          <Trans>
            These Fee values do not include incentives. Fees USD value is calculated at the time they are accrued.
          </Trans>
        </div>
      </>
    );
  }, [daysConsidered, earnedRecently, earnedTotal, comment]);
  if (!earnedTotal && !earnedRecently) {
    return content;
  }

  return <Tooltip renderContent={renderTooltipContent} handle={content} position="right-bottom" />;
};

export const GmTokensTotalBalanceInfo = ({
  balance,
  balanceUsd,
  userEarnings,
}: {
  balance?: BigNumber;
  balanceUsd?: BigNumber;
  userEarnings: UserEarningsData | null;
}) => {
  const daysConsidered = useDaysConsideredInMarketsApr();
  return balance && balanceUsd ? (
    <Tooltip
      handle={<Trans>WALLET</Trans>}
      className="text-none"
      position="right-bottom"
      renderContent={() => (
        <>
          <StatsTooltipRow
            label={t`Total in Wallet`}
            value={[
              formatTokenAmount(balance, 18, "GM", {
                useCommas: true,
                fallbackToZero: true,
              }),
              `(${formatUsd(balanceUsd)})`,
            ]}
            showDollar={false}
          />
          {userEarnings && (
            <>
              <StatsTooltipRow
                label={t`Total Wallet accrued Fees`}
                className={getColorByValue(userEarnings.allMarkets.total)}
                value={formatDeltaUsd(userEarnings.allMarkets.total, undefined, { showPlusForZero: true })}
                showDollar={false}
              />
              <StatsTooltipRow
                label={t`${daysConsidered}d Wallet accrued Fees `}
                className={getColorByValue(userEarnings.allMarkets.recent)}
                value={formatDeltaUsd(userEarnings.allMarkets.recent, undefined, { showPlusForZero: true })}
                showDollar={false}
              />
              {userEarnings.allMarkets.expected365d.gt(0) && (
                <>
                  <StatsTooltipRow
                    label={t`Expected 365d Fees`}
                    className={getColorByValue(userEarnings.allMarkets.expected365d)}
                    value={formatDeltaUsd(userEarnings.allMarkets.expected365d, undefined, { showPlusForZero: true })}
                    showDollar={false}
                  />
                  <br />
                  <Trans>
                    These Fee values do not include incentives. Expected 365d Fees are projected based on past{" "}
                    {daysConsidered}d base APR
                  </Trans>
                </>
              )}
            </>
          )}
        </>
      )}
    />
  ) : (
    <Trans>WALLET</Trans>
  );
};

function getColorByValue(value: BigNumber) {
  if (!value || value.eq(0)) return undefined;

  return value.gt(0) ? "text-green" : "text-red";
}
