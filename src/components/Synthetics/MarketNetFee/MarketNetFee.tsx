import "./MarketNetFee.scss";
import { Trans, t } from "@lingui/macro";
import { BigNumber } from "ethers";
import { formatRatePercentage } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

type Props = {
  fundingRateHourly: BigNumber;
  borrowRateHourly: BigNumber;
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
  const netFeeHourly = borrowRateHourly.add(fundingRateHourly);
  const positionType = isLong ? t`Long Positions` : t`Short Positions`;
  const feeOrRebate = netFeeHourly.gte(0) ? t`Net Rebate` : t`Net Fee`;

  return (
    <>
      <div className="text-gray mb-xs">
        {positionType} {feeOrRebate}:
      </div>
      <ul className="net-fees-over-time">
        {RATE_PERIODS.map((period) => {
          const netFee = netFeeHourly.mul(period.hours);
          return (
            <li key={period.label}>
              <span className="net-fee__period">{period.label}:</span>
              <span className={getPositiveOrNegativeClass(netFee)}>
                {formatRatePercentage(netFee, period.decimals)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-xs">
        <NetFeeMessage {...props} />
      </div>
    </>
  );
}

function renderRate(rate: BigNumber) {
  return <span className={getPositiveOrNegativeClass(rate)}>{formatRatePercentage(rate)}</span>;
}

function NetFeeMessage(props: Props) {
  const { fundingRateHourly, borrowRateHourly, isLong } = props;
  const fundingAction = fundingRateHourly.gte(0) ? t`receive` : t`pay`;
  const borrowAction = fundingAction === t`receive` ? t`pay` : "";
  const longOrShort = isLong ? t`Long` : t`Short`;
  const isFundingRateZero = fundingRateHourly.isZero();
  const isBorrowRateZero = borrowRateHourly.isZero();
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
