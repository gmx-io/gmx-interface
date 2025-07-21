import { t } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";

import { selectPositionSellerFees } from "context/SyntheticsStateContext/selectors/positionSellerSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatPercentage } from "lib/numbers";

import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";

export function PositionSellerPriceImpactFeesRow() {
  const { fees } = useSelector(selectPositionSellerFees);

  const totalPriceImpactPercentage =
    (fees?.positionPriceImpact?.precisePercentage ?? 0n) + (fees?.priceImpactDiff?.precisePercentage ?? 0n);

  const formattedPriceImpactPercentage =
    totalPriceImpactPercentage === undefined
      ? "..."
      : formatPercentage(totalPriceImpactPercentage, {
          bps: false,
          signed: true,
          displayDecimals: 3,
        });

  const isPriceImpactPositive = totalPriceImpactPercentage > 0;

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
      label={t`Net Price Impact / Fees`}
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
