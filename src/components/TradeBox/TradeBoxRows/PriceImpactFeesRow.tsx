import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";

import { DOCS_LINKS } from "config/links";
import { selectChainId, selectUserReferralInfo } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxFees,
  selectTradeboxFeesPercentage,
  selectTradeboxTradeFeesType,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useTradingIncentives } from "domain/synthetics/common/useIncentiveStats";
import { formatPercentage, PRECISION } from "lib/numbers";
import { BASIS_POINTS_DIVISOR_BIGINT } from "sdk/configs/factors";
import { bigMath } from "sdk/utils/bigmath";
import { getCappedPriceImpactPercentageFromFees } from "sdk/utils/fees";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";

export function PriceImpactFeesRow() {
  const chainId = useSelector(selectChainId);
  const fees = useSelector(selectTradeboxFees);
  const feesPercentage = useSelector(selectTradeboxFeesPercentage);
  const userReferralInfo = useSelector(selectUserReferralInfo);
  const feesType = useSelector(selectTradeboxTradeFeesType);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isTrigger, isSwap } = tradeFlags;
  const tradingIncentives = useTradingIncentives(chainId);
  const estimatedRebatesPercentage = tradingIncentives?.estimatedRebatePercent ?? 0n;

  const { formattedPriceImpactPercentage, isPriceImpactPositive } = useMemo(() => {
    const priceImpactPercentage = isTrigger || isSwap ? getCappedPriceImpactPercentageFromFees({ fees, isSwap }) : 0n;
    return {
      formattedPriceImpactPercentage:
        priceImpactPercentage === undefined
          ? "..."
          : formatPercentage(priceImpactPercentage, {
              bps: false,
              signed: true,
              displayDecimals: 3,
            }),
      isPriceImpactPositive: priceImpactPercentage !== undefined && priceImpactPercentage > 0,
    };
  }, [fees, isTrigger, isSwap]);

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

  if (isTrigger) {
    return (
      <SyntheticsInfoRow
        label={
          <Tooltip
            handle={t`Net price impact / fees`}
            content={
              <Trans>
                Net price impact and fees from your trade.{" "}
                <ExternalLink href={DOCS_LINKS.priceImpact} newTab>
                  Read more
                </ExternalLink>.
              </Trans>
            }
          />
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

  if (isSwap) {
    return (
      <SyntheticsInfoRow
        label={t`Price impact / fees`}
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
              className={cx("numbers", {
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

  return (
    <SyntheticsInfoRow
      label={
        <span>
          <Tooltip
            handle={t`Price impact`}
            content={
              <Trans>
                No price impact on increases — orders execute at mark price.{" "}
                <ExternalLink href={DOCS_LINKS.priceImpact} newTab>
                  Read more
                </ExternalLink>.
              </Trans>
            }
          />
          {" / "}
          {t`fees`}
        </span>
      }
      value={
        <>
          <span>0.000%</span> /{" "}
          <span
            className={cx("numbers", {
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
