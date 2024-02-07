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
  const borrowRateClassName = getPositiveOrNegativeClass(borrowRateHourly);
  const fundingRateClassName = getPositiveOrNegativeClass(fundingRateHourly);

  function renderFundingMessage() {
    const receiveOrPay = fundingRateHourly.gte(0) ? t`receive` : t`pay`;
    const longOrShort = isLong ? t`Long` : t`Short`;
    return (
      <Trans>
        {longOrShort} Positions {receiveOrPay} a Funding Fee of{" "}
        <span className={fundingRateClassName}>{formatRatePercentage(fundingRateHourly)}</span> per hour.
      </Trans>
    );
  }
  function renderBorrowMessage() {
    const longOrShort = isLong ? t`Long` : t`Short`;

    if (borrowRateHourly.isZero()) {
      return <Trans>{longOrShort} Positions do not pay a Borrow Fee.</Trans>;
    } else {
      return (
        <Trans>
          {longOrShort} Positions pay a Borrow Fee of{" "}
          <span className={borrowRateClassName}>{formatRatePercentage(borrowRateHourly)}</span> per hour.
        </Trans>
      );
    }
  }

  return (
    <>
      <div className="mb-xs">{renderFundingMessage()}</div>
      <div>{renderBorrowMessage()}</div>
      <br />
      <div className="text-gray">{t`${isLong ? "Long" : "Short"} Positions Net Fee:`}</div>
      {renderNetFeesOverTime(netFeeHourly)}
    </>
  );
}

function renderNetFeesOverTime(hourlyRate: BigNumber) {
  function formatRateForPeriod(hours: number) {
    const rateForPeriod = hourlyRate.mul(hours);
    return <span className={getPositiveOrNegativeClass(rateForPeriod)}>{formatRatePercentage(rateForPeriod)}</span>;
  }
  return (
    <ul className="net-fees-over-time">
      <li>1h: {formatRateForPeriod(1)}</li>
      <li>7d: {formatRateForPeriod(24 * 7)}</li>
      <li>365d: {formatRateForPeriod(24 * 365)}</li>
    </ul>
  );
}
