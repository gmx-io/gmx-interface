import { t } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";

import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import { selectChainId, selectUserReferralInfo } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxFees,
  selectTradeboxFeesPercentage,
  selectTradeboxPriceImpactPercentage,
  selectTradeboxTradeFeesType,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useTradingIncentives } from "domain/synthetics/common/useIncentiveStats";
import { PRECISION, formatPercentage } from "lib/numbers";
import { BASIS_POINTS_DIVISOR_BIGINT } from "sdk/configs/factors";
import { bigMath } from "sdk/utils/bigmath";

export function PriceImpactFeesRow() {
  const chainId = useSelector(selectChainId);
  const fees = useSelector(selectTradeboxFees);
  const priceImpactPercentage = useSelector(selectTradeboxPriceImpactPercentage);
  const feesPercentage = useSelector(selectTradeboxFeesPercentage);
  const userReferralInfo = useSelector(selectUserReferralInfo);
  const feesType = useSelector(selectTradeboxTradeFeesType);
  const tradingIncentives = useTradingIncentives(chainId);
  const estimatedRebatesPercentage = tradingIncentives?.estimatedRebatePercent ?? 0n;

  const isPriceImpactPositive = priceImpactPercentage !== undefined && priceImpactPercentage > 0;

  const formattedPriceImpactPercentage =
    priceImpactPercentage === undefined
      ? "..."
      : formatPercentage(priceImpactPercentage, {
          bps: false,
          signed: true,
        });

  const rebateIsApplicable =
    fees?.positionFee?.deltaUsd !== undefined && fees.positionFee.deltaUsd <= 0 && feesType !== "swap";

  const { formattedTotalFeePercentage, isTotalFeePositive } = useMemo(() => {
    if (feesPercentage === undefined) {
      return {
        formattedTotalFeePercentage: "...",
        isTotalFeePositive: false,
      };
    }

    let adjustedFeesPercentage = feesPercentage;

    if (feesType !== "swap") {
      let referralDiscountPercentageOfSize = 0n;
      if (userReferralInfo) {
        referralDiscountPercentageOfSize = bigMath.mulDiv(
          bigMath.mulDiv(feesPercentage, userReferralInfo.totalRebateFactor, PRECISION),
          userReferralInfo.discountFactor,
          PRECISION
        );
      }

      let estimatedRebatesPercentagePreciseOfSize = 0n;
      if (rebateIsApplicable) {
        estimatedRebatesPercentagePreciseOfSize = bigMath.mulDiv(
          bigMath.mulDiv(estimatedRebatesPercentage, PRECISION, BASIS_POINTS_DIVISOR_BIGINT),
          feesPercentage,
          PRECISION
        );
      }

      adjustedFeesPercentage =
        feesPercentage - referralDiscountPercentageOfSize - estimatedRebatesPercentagePreciseOfSize;
    }

    return {
      formattedTotalFeePercentage: formatPercentage(adjustedFeesPercentage, {
        bps: false,
        signed: true,
        displayDecimals: 3,
      }),
      isTotalFeePositive: adjustedFeesPercentage > 0,
    };
  }, [feesPercentage, feesType, userReferralInfo, rebateIsApplicable, estimatedRebatesPercentage]);

  return (
    <SyntheticsInfoRow
      label={isPriceImpactPositive ? t`Positive Price Impact / Fees` : t`Price Impact / Fees`}
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
