import { Trans, t } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
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
          <Trans>Fees USD value is calculated at the time they are accrued.</Trans>
        </div>
      </>
    );
  }, [daysConsidered, earnedRecently, earnedTotal, comment]);
  if (!earnedTotal && !earnedRecently) {
    return content;
  }

  return <Tooltip renderContent={renderTooltipContent} handle={content} position="right-bottom" />;
};

function getColorByValue(value: BigNumber) {
  if (!value || value.eq(0)) return undefined;

  return value.gt(0) ? "text-green" : "text-red";
}
