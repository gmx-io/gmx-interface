import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";

import { DOCS_LINKS } from "config/links";
import { selectPositionSellerFees } from "context/SyntheticsStateContext/selectors/positionSellerSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatPercentage } from "lib/numbers";
import { getCappedPriceImpactPercentageFromFees } from "sdk/utils/fees";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";

export function PositionSellerPriceImpactFeesRow() {
  const { fees } = useSelector(selectPositionSellerFees);

  const totalPriceImpactPercentage = getCappedPriceImpactPercentageFromFees({ fees, isSwap: false });

  const formattedPriceImpactPercentage =
    totalPriceImpactPercentage === undefined
      ? "..."
      : formatPercentage(totalPriceImpactPercentage, {
          bps: false,
          signed: true,
          displayDecimals: 3,
        });

  const isPriceImpactPositive = totalPriceImpactPercentage !== undefined && totalPriceImpactPercentage > 0;

  const feesPercentage = fees?.positionFee?.precisePercentage ?? 0n;

  const { formattedTotalFeePercentage, isTotalFeePositive } = useMemo(() => {
    if (feesPercentage === undefined) {
      return {
        formattedTotalFeePercentage: "...",
        isTotalFeePositive: false,
      };
    }

    let adjustedFeesPercentage = feesPercentage;

    return {
      formattedTotalFeePercentage: formatPercentage(adjustedFeesPercentage, {
        bps: false,
        signed: true,
        displayDecimals: 3,
      }),
      isTotalFeePositive: adjustedFeesPercentage > 0,
    };
  }, [feesPercentage]);

  return (
    <SyntheticsInfoRow
      label={
        <>
          <Tooltip
            handle={t`Net price impact`}
            content={
              <Trans>
                Price impact from closing. Positive values benefit you.{" "}
                <ExternalLink href={DOCS_LINKS.priceImpact} newTab>
                  Read more
                </ExternalLink>
                .
              </Trans>
            }
          />{" "}
          / {t`fees`}
        </>
      }
      value={
        <>
          <span
            className={cx({
              "text-green-500": isPriceImpactPositive,
            })}
          >
            {formattedPriceImpactPercentage}
          </span>{" "}
          /{" "}
          <span
            className={cx({
              "text-green-500": isTotalFeePositive,
            })}
          >
            {formattedTotalFeePercentage}
          </span>
        </>
      }
    />
  );
}
