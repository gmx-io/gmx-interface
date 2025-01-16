import { t } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";

import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import { selectChainId, selectUserReferralInfo } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxFees,
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
  const userReferralInfo = useSelector(selectUserReferralInfo);
  const feesType = useSelector(selectTradeboxTradeFeesType);
  const tradingIncentives = useTradingIncentives(chainId);
  const estimatedRebatesPercentage = tradingIncentives?.estimatedRebatePercent ?? 0n;

  const fullPositionPriceImpactPercentage =
    fees?.positionPriceImpact?.precisePercentage !== undefined && fees?.priceImpactDiff?.precisePercentage !== undefined
      ? fees.positionPriceImpact.precisePercentage - fees.priceImpactDiff.precisePercentage
      : undefined;

  const isPriceImpactPositive =
    fullPositionPriceImpactPercentage !== undefined && fullPositionPriceImpactPercentage > 0;

  const formattedPriceImpactPercentage =
    fullPositionPriceImpactPercentage === undefined
      ? "..."
      : formatPercentage(fullPositionPriceImpactPercentage, {
          bps: false,
          signed: isPriceImpactPositive,
        });

  const rebateIsApplicable =
    fees?.positionFee?.deltaUsd !== undefined && fees.positionFee.deltaUsd <= 0 && feesType !== "swap";

  const { formattedTotalFeePercentage, isTotalFeePositive } = useMemo(() => {
    const positionFeePercentage = fees?.positionFee?.precisePercentage;

    if (positionFeePercentage === undefined) {
      return {
        formattedTotalFeePercentage: "...",
        isTotalFeePositive: false,
      };
    }

    let referralDiscountPercentageOfSize = 0n;
    if (userReferralInfo) {
      referralDiscountPercentageOfSize = bigMath.mulDiv(
        bigMath.mulDiv(positionFeePercentage, userReferralInfo.totalRebateFactor, PRECISION),
        userReferralInfo.discountFactor,
        PRECISION
      );
    }

    let estimatedRebatesPercentagePreciseOfSize = 0n;
    if (rebateIsApplicable) {
      estimatedRebatesPercentagePreciseOfSize = bigMath.mulDiv(
        bigMath.mulDiv(estimatedRebatesPercentage, PRECISION, BASIS_POINTS_DIVISOR_BIGINT),
        positionFeePercentage,
        PRECISION
      );
    }

    const positionFeeAfterRebateAndDiscount =
      positionFeePercentage - referralDiscountPercentageOfSize - estimatedRebatesPercentagePreciseOfSize;

    return {
      formattedTotalFeePercentage: formatPercentage(positionFeeAfterRebateAndDiscount, {
        bps: false,
        signed: positionFeeAfterRebateAndDiscount > 0,
        displayDecimals: 3,
      }),
      isTotalFeePositive: positionFeeAfterRebateAndDiscount > 0,
    };
  }, [fees?.positionFee?.precisePercentage, userReferralInfo, rebateIsApplicable, estimatedRebatesPercentage]);

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
