import { t } from "@lingui/macro";

import { expandDecimals, formatUsdPrice, PERCENT_PRECISION_DECIMALS } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { getCappedPriceImpactPercentageFromFees } from "sdk/utils/fees";
import { TradeFees } from "sdk/utils/trade/types";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";

const ONE_HUNDRED_PERCENT = expandDecimals(100n, PERCENT_PRECISION_DECIMALS);

export function ExitPriceRow({
  price,
  isLong,
  isSwap,
  fees,
}: {
  price: bigint | undefined;
  isLong: boolean;
  isSwap: boolean;
  fees: TradeFees | undefined;
}) {
  const cappedPriceImpact = getCappedPriceImpactPercentageFromFees({ fees, isSwap });
  const exitPrice =
    cappedPriceImpact !== undefined && price !== undefined
      ? isLong
        ? bigMath.mulDiv(price, ONE_HUNDRED_PERCENT + cappedPriceImpact, ONE_HUNDRED_PERCENT)
        : bigMath.mulDiv(price, ONE_HUNDRED_PERCENT - cappedPriceImpact, ONE_HUNDRED_PERCENT)
      : undefined;

  return (
    <SyntheticsInfoRow
      label={
        <TooltipWithPortal
          variant="iconStroke"
          handle={t`Exit price`}
          content={t`Price you'll receive when closing, adjusted for capped price impact`}
        />
      }
      value={exitPrice !== undefined ? formatUsdPrice(exitPrice) : "-"}
    />
  );
}
