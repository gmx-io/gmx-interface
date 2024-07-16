import "./MarketNetFee.scss";
import { Trans, t } from "@lingui/macro";
import { formatRatePercentage } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

type Props = {
  fundingRateHourly: bigint;
  borrowRateHourly: bigint;
  isLong: boolean;
};

const RATE_PERIODS = [
  {
    hours: 8,
    label: "8h",
    decimals: 3,
  },
  {
    hours: 24,
    label: "24h",
    decimals: 3,
  },
  {
    hours: 8760,
    label: "365d",
    decimals: 2,
  },
];

export default function MarketNetFee(props: Props) {
  const { borrowRateHourly, fundingRateHourly, isLong } = props;
  const netFeeHourly = borrowRateHourly + fundingRateHourly;
  const positionType = isLong ? t`Long Positions` : t`Short Positions`;
  const netRate = t`Net Rate`;

  return (
    <>
      <div className="mb-5 text-gray-300">
        {positionType} {netRate}:
      </div>
      <ul className="net-fees-over-time">
        {RATE_PERIODS.map((period) => {
          const netFee = netFeeHourly * BigInt(period.hours);
          return (
            <li key={period.label}>
              <span className="net-fee__period">{period.label}:</span>
              <span className={getPositiveOrNegativeClass(netFee)}>
                {formatRatePercentage(netFee, {
                  displayDecimals: period.decimals,
                })}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-5">
        <NetFeeMessage {...props} />
      </div>
    </>
  );
}

function renderRate(rate: bigint) {
  return <span className={getPositiveOrNegativeClass(rate)}>{formatRatePercentage(rate)}</span>;
}

function NetFeeMessage(props: Props) {
  const { fundingRateHourly, borrowRateHourly, isLong } = props;
  const fundingAction = fundingRateHourly >= 0 ? t`receive` : t`pay`;
  const borrowAction = fundingAction === t`receive` ? t`pay` : "";
  const longOrShort = isLong ? t`Long` : t`Short`;
  const isFundingRateZero = fundingRateHourly === 0n;
  const isBorrowRateZero = borrowRateHourly === 0n;
  const fundingRate = renderRate(fundingRateHourly);
  const borrowRate = renderRate(borrowRateHourly);

  if (isFundingRateZero && isBorrowRateZero) {
    return <Trans>{longOrShort} positions do not pay a funding fee or a borrow fee.</Trans>;
  } else if (isFundingRateZero) {
    return (
      <Trans>
        {longOrShort} positions do not pay a funding fee and pay a borrow fee of {borrowRate} per hour.
      </Trans>
    );
  } else if (isBorrowRateZero) {
    return (
      <Trans>
        {longOrShort} positions {fundingAction} a funding fee of {fundingRate} per hour and do not pay a borrow fee.
      </Trans>
    );
  } else {
    return (
      <Trans>
        {longOrShort} positions {fundingAction} a funding fee of {fundingRate} per hour and {borrowAction} a borrow fee
        of {borrowRate} per hour.
      </Trans>
    );
  }
}
