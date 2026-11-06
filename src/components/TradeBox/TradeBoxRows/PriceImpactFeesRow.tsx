import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";

import { DOCS_LINKS } from "config/links";
import { selectChainId, selectUserReferralInfo } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxFees,
  selectTradeboxFeesPercentage,
  selectTradeboxSwapAmounts,
  selectTradeboxTradeFeesType,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useTradingIncentives } from "domain/synthetics/common/useIncentiveStats";
import { useMegaethPointsActive } from "domain/synthetics/common/useMegaethPointsActive";
import { formatPercentage, PRECISION } from "lib/numbers";
import { BASIS_POINTS_DIVISOR_BIGINT } from "sdk/configs/factors";
import { bigMath } from "sdk/utils/bigmath";
import { getCappedPriceImpactPercentageFromFees } from "sdk/utils/fees";

import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipLink, TooltipText } from "components/Tooltip/TooltipBlocks";

import sparkleIcon from "img/sparkle.svg";

export function PriceImpactFeesRow() {
  const chainId = useSelector(selectChainId);
  const fees = useSelector(selectTradeboxFees);
  const feesPercentage = useSelector(selectTradeboxFeesPercentage);
  const userReferralInfo = useSelector(selectUserReferralInfo);
  const feesType = useSelector(selectTradeboxTradeFeesType);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isTrigger, isSwap } = tradeFlags;
  const swapAmounts = useSelector(selectTradeboxSwapAmounts);
  const isExternalSwap = isSwap && swapAmounts?.swapStrategy.type === "externalSwap";
  const tradingIncentives = useTradingIncentives(chainId);
  const estimatedRebatesPercentage = tradingIncentives?.estimatedRebatePercent ?? 0n;
  const isMegaethPointsActive = useMegaethPointsActive();

  const megaethPointsSparkle = isMegaethPointsActive ? (
    <StandardTooltip
      variant="none"
      handle={
        <span className="inline-flex items-center gap-3 rounded-4 bg-blue-300/20 px-6 py-2 text-12 font-medium text-blue-300">
          <img className="h-10" src={sparkleIcon} alt="" />
          <Trans>Earns MegaETH points</Trans>
        </span>
      }
      content={t`Points are allocated based on your cumulative trading volume on GMX MegaETH`}
    />
  ) : null;

  const { formattedPriceImpactPercentage, isPriceImpactPositive } = useMemo(() => {
    if (isExternalSwap) {
      return { formattedPriceImpactPercentage: "-", isPriceImpactPositive: false };
    }

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
  }, [fees, isTrigger, isSwap, isExternalSwap]);

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
      <div className="flex flex-col gap-4">
        <SyntheticsInfoRow
          label={
            <StandardTooltip
              handle={t`Net price impact / fees`}
              content={
                <TooltipContent>
                  <TooltipText>
                    <Trans>Net price impact and fees from your trade.</Trans>
                  </TooltipText>
                  <TooltipLink href={DOCS_LINKS.priceImpact}>
                    <Trans>Read more</Trans>
                  </TooltipLink>
                </TooltipContent>
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
        {megaethPointsSparkle && <div className="flex justify-end">{megaethPointsSparkle}</div>}
      </div>
    );
  }

  if (isSwap) {
    return (
      <div className="flex flex-col gap-4">
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
        {megaethPointsSparkle && <div className="flex justify-end">{megaethPointsSparkle}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SyntheticsInfoRow
        label={
          <span>
            <StandardTooltip
              handle={t`Price impact`}
              content={
                <TooltipContent>
                  <TooltipText>
                    <Trans>No price impact on increases — orders execute at mark price.</Trans>
                  </TooltipText>
                  <TooltipLink href={DOCS_LINKS.priceImpact}>
                    <Trans>Read more</Trans>
                  </TooltipLink>
                </TooltipContent>
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
      {megaethPointsSparkle && <div className="flex justify-end">{megaethPointsSparkle}</div>}
    </div>
  );
}
