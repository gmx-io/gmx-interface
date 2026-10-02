import { SOLANA_USD_DECIMALS, USD_DECIMALS } from "config/factors";

import MarketNetFee from "components/MarketNetFee/MarketNetFee";

// MarketNetFee formats rates with USD_DECIMALS precision, Solana rates use SOLANA_USD_DECIMALS
const SOLANA_RATE_SCALE = 10n ** BigInt(USD_DECIMALS - SOLANA_USD_DECIMALS);

type Props = {
  fundingRateLong?: bigint;
  fundingRateShort?: bigint;
  borrowingRateLong?: bigint;
  borrowingRateShort?: bigint;
};

export function NetRate1hTooltip({ fundingRateLong, fundingRateShort, borrowingRateLong, borrowingRateShort }: Props) {
  if (
    fundingRateLong === undefined ||
    fundingRateShort === undefined ||
    borrowingRateLong === undefined ||
    borrowingRateShort === undefined
  ) {
    return null;
  }

  return (
    <div>
      <MarketNetFee
        borrowRateHourly={borrowingRateLong * SOLANA_RATE_SCALE}
        fundingRateHourly={fundingRateLong * SOLANA_RATE_SCALE}
        isLong={true}
      />
      <br />
      <MarketNetFee
        borrowRateHourly={borrowingRateShort * SOLANA_RATE_SCALE}
        fundingRateHourly={fundingRateShort * SOLANA_RATE_SCALE}
        isLong={false}
      />
    </div>
  );
}
