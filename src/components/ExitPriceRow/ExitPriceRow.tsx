import { Trans, t } from "@lingui/macro";

import { DOCS_LINKS } from "config/links";
import { expandDecimals, PERCENT_PRECISION_DECIMALS } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { getCappedPriceImpactPercentageFromFees } from "sdk/utils/fees";
import { TradeFees } from "sdk/utils/trade/types";

import { UsdPriceValue } from "components/NumericValue/UsdPriceValue";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";

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
        <StandardTooltip
          handle={t`Exit price`}
          content={
            <TooltipContent>
              <TooltipText>
                <Trans>Price you'll receive when closing, adjusted for capped price impact.</Trans>
              </TooltipText>
              <TooltipLink href={DOCS_LINKS.priceImpact}>
                <Trans>Read more</Trans>
              </TooltipLink>
            </TooltipContent>
          }
        />
      }
      value={exitPrice !== undefined ? <UsdPriceValue price={exitPrice} /> : "-"}
    />
  );
}
