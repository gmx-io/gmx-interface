import { Trans, t } from "@lingui/macro";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { BigNumber } from "ethers";
import { BN_ZERO, formatRatePercentage } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

type Props = {
  fundingRateHourly: BigNumber;
  isLong: boolean;
  borrowRateHourly: BigNumber;
};

export default function MarketNetFee({ borrowRateHourly = BN_ZERO, fundingRateHourly = BN_ZERO, isLong }: Props) {
  const netFeeHourly = borrowRateHourly.add(fundingRateHourly);
  const borrowRateClassName = getPositiveOrNegativeClass(borrowRateHourly);
  const fundingRateClassName = getPositiveOrNegativeClass(fundingRateHourly);
  const fundingMsgLong =
    isLong && fundingRateHourly.gte(0) ? (
      <Trans>
        Long Positions receive a Funding Fee of{" "}
        <span className={fundingRateClassName}>{formatRatePercentage(fundingRateHourly)}</span> per hour.
      </Trans>
    ) : (
      <Trans>
        Long Positions pay a Funding Fee of{" "}
        <span className={fundingRateClassName}>{formatRatePercentage(fundingRateHourly)}</span> per hour.
      </Trans>
    );
  const fundingMsgShort =
    !isLong && fundingRateHourly.gte(0) ? (
      <Trans>
        Short Positions receive a Funding Fee of{" "}
        <span className={fundingRateClassName}>{formatRatePercentage(fundingRateHourly)}</span> per hour.
      </Trans>
    ) : (
      <Trans>
        Short Positions pay a Funding Fee of{" "}
        <span className={fundingRateClassName}>{formatRatePercentage(fundingRateHourly)}</span> per hour.
      </Trans>
    );

  const borrowingMsgLong = (
    <Trans>
      Long Positions pay a Borrow Fee of{" "}
      <span className={borrowRateClassName}>{formatRatePercentage(borrowRateHourly)}</span> per hour.
    </Trans>
  );

  const borrowingMsgShort = t`Short Positions do not pay a Borrow Fee.`;

  if (isLong) {
    return (
      <>
        <div className="mb-xs">{fundingMsgLong}</div>
        <div>{borrowingMsgLong}</div>
        <br />
        <StatsTooltipRow
          showDollar={false}
          label={t`Long Positions Net Fee`}
          value={renderNetFeesOverTime(netFeeHourly)}
        />
      </>
    );
  }

  if (!isLong) {
    return (
      <>
        <div className="mb-xs">{fundingMsgShort}</div>
        <div>{borrowingMsgShort}</div>
        <br />
        <StatsTooltipRow
          showDollar={false}
          label={t`Short Positions Net Fee`}
          value={renderNetFeesOverTime(netFeeHourly)}
        />
      </>
    );
  }
  return <></>;
}

function renderNetFeesOverTime(hourlyRate: BigNumber) {
  function formatRateForPeriod(hours: number) {
    const rateForPeriod = hourlyRate.mul(hours);
    return <span className={getPositiveOrNegativeClass(rateForPeriod)}>{formatRatePercentage(rateForPeriod)}</span>;
  }
  return (
    <ul className="net-fees-over-time">
      <li>1h: {formatRateForPeriod(1)}</li>
      <li>8h: {formatRateForPeriod(8)}</li>
      <li>24h: {formatRateForPeriod(24)}</li>
      <li>Weekly: {formatRateForPeriod(24 * 7)}</li>
      <li>Annualized: {formatRateForPeriod(24 * 365)}</li>
    </ul>
  );
}
