import { Trans, t } from "@lingui/macro";
import { BigNumber } from "ethers";
import { BN_ZERO, formatRatePercentage } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

type Props = {
  fundingRateHourly: BigNumber;
  borrowRateHourly: BigNumber;
  isLong: boolean;
};

export default function MarketNetFee({ borrowRateHourly = BN_ZERO, fundingRateHourly = BN_ZERO, isLong }: Props) {
  const netFeeHourly = borrowRateHourly.add(fundingRateHourly);

  function renderMessage() {
    const fundingAction = fundingRateHourly.gte(0) ? t`receive` : t`pay`;
    const longOrShort = isLong ? t`Long` : t`Short`;

    if (fundingRateHourly.isZero() && borrowRateHourly.isZero()) {
      return <Trans>{longOrShort} Positions do not pay a Funding Fee or a Borrow Fee.</Trans>;
    } else if (fundingRateHourly.isZero() && !borrowRateHourly.isZero()) {
      return (
        <Trans>
          {longOrShort} Positions do not pay a Funding Fee and pay a Borrow Fee of {renderRate(borrowRateHourly)} per
          hour.
        </Trans>
      );
    } else if (!fundingRateHourly.isZero() && borrowRateHourly.isZero()) {
      return (
        <Trans>
          {longOrShort} Positions {fundingAction} a Funding Fee of {renderRate(fundingRateHourly)} per hour and do not
          pay a Borrow Fee.
        </Trans>
      );
    } else {
      return (
        <Trans>
          {longOrShort} Positions {fundingAction} a Funding Fee of {renderRate(fundingRateHourly)} per hour and{" "}
          {fundingRateHourly.gt(0) ? t`pay` : ""} a Borrow Fee of {renderRate(borrowRateHourly)} per hour.
        </Trans>
      );
    }
  }

  return (
    <>
      <div className="mb-xs">{renderMessage()}</div>
      <br />
      <div className="text-gray">{t`${isLong ? "Long" : "Short"} Positions Net Fee:`}</div>
      {renderNetFeesOverTime(netFeeHourly)}
    </>
  );
}

function renderRate(rate: BigNumber) {
  return <span className={getPositiveOrNegativeClass(rate)}>{formatRatePercentage(rate)}</span>;
}
function renderNetFeesOverTime(hourlyRate: BigNumber) {
  function formatRateForPeriod(hours: number) {
    const rateForPeriod = hourlyRate.mul(hours);
    return <span className={getPositiveOrNegativeClass(rateForPeriod)}>{formatRatePercentage(rateForPeriod)}</span>;
  }
  return (
    <ul className="net-fees-over-time">
      <li>8h: {formatRateForPeriod(8)}</li>
      <li>1d: {formatRateForPeriod(24)}</li>
      <li>7d: {formatRateForPeriod(24 * 7)}</li>
      <li>365d: {formatRateForPeriod(24 * 365)}</li>
    </ul>
  );
}
