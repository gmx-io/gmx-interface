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
import { useMegaethPointsActive } from "domain/synthetics/common/useMegaethPointsActive";
import { formatPercentage, PRECISION } from "lib/numbers";
import { BASIS_POINTS_DIVISOR_BIGINT } from "sdk/configs/factors";
import { bigMath } from "sdk/utils/bigmath";
import { getCappedPriceImpactPercentageFromFees } from "sdk/utils/fees";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import sparkleIcon from "img/sparkle.svg";

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
  const isMegaethPointsActive = useMegaethPointsActive();

  const megaethPointsSparkle = isMegaethPointsActive ? (
    <TooltipWithPortal
      variant="none"
      maxAllowedWidth={350}
      handle={
        <span className="inline-flex items-center gap-3 rounded-4 bg-blue-300/20 px-6 py-2 text-12 font-medium text-blue-300">
          <img className="h-10" src={sparkleIcon} alt="" />
          <Trans>Earns MegaETH points</Trans>
        </span>
      }
      content={<Trans>Points are allocated based on your cumulative trading volume on GMX MegaETH.</Trans>}
    />
  ) : null;

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
      <div className="flex flex-col gap-4">
        <SyntheticsInfoRow
          label={
            <Tooltip
              handle={t`Net price impact / fees`}
              content={
                <Trans>
                  Net price impact and fees from your trade.{" "}
                  <ExternalLink href={DOCS_LINKS.priceImpact} newTab>
                    Read more
                  </ExternalLink>
                  .
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
            <Tooltip
              handle={t`Price impact`}
              content={
                <Trans>
                  No price impact on increases — orders execute at mark price.{" "}
                  <ExternalLink href={DOCS_LINKS.priceImpact} newTab>
                    Read more
                  </ExternalLink>
                  .
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
      {megaethPointsSparkle && <div className="flex justify-end">{megaethPointsSparkle}</div>}
    </div>
  );
}
