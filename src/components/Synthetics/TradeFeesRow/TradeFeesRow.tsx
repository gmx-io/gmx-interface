import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { BigNumber } from "ethers";
import { ReactNode, useMemo } from "react";

import { BASIS_POINTS_DIVISOR } from "config/factors";
import { getToken } from "config/tokens";
import { useTradingIncentives } from "domain/synthetics/common/useIncentiveStats";
import { FeeItem, SwapFeeItem } from "domain/synthetics/fees";
import { TradeFeesType } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { formatAmount, formatDeltaUsd, formatPercentage } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import "./TradeFeesRow.scss";

type Props = {
  totalFees?: FeeItem;
  shouldShowRebate?: boolean;
  swapFees?: SwapFeeItem[];
  swapProfitFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  positionFee?: FeeItem;
  positionPriceImpact?: FeeItem;
  priceImpactDiff?: FeeItem;
  borrowFee?: FeeItem;
  fundingFee?: FeeItem;
  borrowFeeRateStr?: string;
  fundingFeeRateStr?: string;
  feeDiscountUsd?: BigNumber;
  isTop?: boolean;
  feesType: TradeFeesType;
  uiFee?: FeeItem;
  uiSwapFee?: FeeItem;
};

type FeeRow = {
  id: string;
  label: ReactNode;
  value: ReactNode;
  className?: string;
};

export function TradeFeesRow(p: Props) {
  const { chainId } = useChainId();
  const tradingIncentives = useTradingIncentives();
  const shouldShowRebate = p.shouldShowRebate ?? true;
  const rebateIsApplicable = shouldShowRebate && p.positionFee?.deltaUsd.lt(0) && p.feesType !== "swap";

  const [fullPositionPriceImpact, hasRebates] = mergePositionPriceImpactWithPriceImpactDiff(
    p.feesType,
    p.positionPriceImpact,
    p.priceImpactDiff
  );
  const rebatesMessage = useMemo(
    () =>
      hasRebates ? (
        <Trans>
          Price Impact Rebates for closing trades are claimable under the Claims tab.{" "}
          <ExternalLink newTab href="https://docs.gmx.io/docs/trading/v2/#price-impact-rebates">
            Read more
          </ExternalLink>
          .
        </Trans>
      ) : undefined,
    [hasRebates]
  );

  const feeRows: FeeRow[] = useMemo(() => {
    const positionPriceImpactRow = fullPositionPriceImpact?.deltaUsd.abs().gt(0)
      ? {
          id: "positionPriceImpact",
          label: (
            <>
              <div className="text-white">{t`Position Price Impact`}:</div>
              <div>({formatPercentage(fullPositionPriceImpact.bps.abs())} of position size)</div>
            </>
          ),
          value: formatDeltaUsd(fullPositionPriceImpact.deltaUsd),
          className: getPositiveOrNegativeClass(fullPositionPriceImpact.deltaUsd, "text-green-500"),
        }
      : undefined;

    const priceImpactDiffUsd = p.priceImpactDiff?.deltaUsd.abs().gt(0)
      ? {
          id: "priceImpactDiff",
          label: (
            <>
              <div className="text-white">{t`Price Impact Rebates`}:</div>
              <div>({formatPercentage(p.priceImpactDiff.bps.abs())} of position size)</div>
            </>
          ),
          value: formatDeltaUsd(p.priceImpactDiff.deltaUsd),
          className: getPositiveOrNegativeClass(p.priceImpactDiff.deltaUsd, "text-green-500"),
        }
      : undefined;

    const swapPriceImpactRow = p.swapPriceImpact?.deltaUsd.abs().gt(0)
      ? {
          id: "swapPriceImpact",
          label: (
            <>
              <div className="text-white">{t`Swap Price Impact`}:</div>
              <div>({formatPercentage(p.swapPriceImpact.bps.abs())} of swap amount)</div>
            </>
          ),
          value: formatDeltaUsd(p.swapPriceImpact.deltaUsd),
          className: getPositiveOrNegativeClass(p.swapPriceImpact.deltaUsd, "text-green-500"),
        }
      : undefined;

    const swapFeeRows: FeeRow[] =
      p.swapFees?.map((swap) => ({
        id: `swap-${swap.tokenInAddress}-${swap.tokenOutAddress}`,
        label: (
          <>
            <div className="text-white">
              {t`Swap ${getToken(chainId, swap.tokenInAddress).symbol} to ${
                getToken(chainId, swap.tokenOutAddress).symbol
              }`}
              :
            </div>
            <div>({formatPercentage(swap.bps.abs())} of swap amount)</div>
          </>
        ),
        value: formatDeltaUsd(swap.deltaUsd),
        className: getPositiveOrNegativeClass(swap.deltaUsd, "text-green-500"),
      })) || [];

    const swapProfitFeeRow = p.swapProfitFee?.deltaUsd.abs().gt(0)
      ? {
          id: "swapProfitFee",
          label: (
            <>
              <div className="text-white">{t`Swap Profit Fee`}:</div>
              <div>({formatPercentage(p.swapProfitFee.bps.abs())} of collateral)</div>
            </>
          ),
          value: formatDeltaUsd(p.swapProfitFee.deltaUsd),
          className: getPositiveOrNegativeClass(p.swapProfitFee.deltaUsd, "text-green-500"),
        }
      : undefined;

    const feesTypeName = p.feesType === "increase" ? t`Open Fee` : t`Close Fee`;
    const positionFeeRow = p.positionFee?.deltaUsd.abs().gt(0)
      ? {
          id: "positionFee",
          label: (
            <>
              <div className="text-white">{feesTypeName}:</div>
              <div>({formatPercentage(p.positionFee.bps.abs())} of position size)</div>
            </>
          ),
          value: formatDeltaUsd(p.positionFee.deltaUsd),
          className: getPositiveOrNegativeClass(p.positionFee.deltaUsd, "text-green-500"),
        }
      : undefined;

    const uiFeeRow = p.uiFee?.deltaUsd?.abs().gt(0)
      ? {
          id: "uiFee",
          label: (
            <>
              <div className="text-white">{t`UI Fee`}:</div>
              <div>
                ({formatPercentage(p.uiFee.bps.abs())} of {p.feesType === "swap" ? "swap amount" : "position size"})
              </div>
            </>
          ),
          value: formatDeltaUsd(p.uiFee.deltaUsd),
          className: "text-red-500",
        }
      : undefined;

    const uiSwapFeeRow = p.uiSwapFee?.deltaUsd?.abs().gt(0)
      ? {
          id: "swapUiFee",
          label: (
            <>
              <div className="text-white">{p.feesType === "swap" ? t`UI Fee` : t`Swap UI Fee`}:</div>
              <div>({formatPercentage(p.uiSwapFee.bps.abs())} of swap amount)</div>
            </>
          ),
          value: formatDeltaUsd(p.uiSwapFee.deltaUsd),
          className: "text-red-500",
        }
      : undefined;

    const feeDiscountRow = p.feeDiscountUsd?.gt(0)
      ? {
          id: "feeDiscount",
          label: (
            <div className="text-white">
              <Trans>Referral Discount</Trans>:
            </div>
          ),
          value: formatDeltaUsd(p.feeDiscountUsd),
          className: "text-green-500",
        }
      : undefined;

    const borrowFeeRow = p.borrowFee?.deltaUsd?.abs().gt(0)
      ? {
          id: "borrowFee",
          label: (
            <>
              <div className="text-white">{t`Borrow Fee`}:</div>
              <div>({formatPercentage(p.borrowFee.bps.abs())} of collateral)</div>
            </>
          ),
          value: formatDeltaUsd(p.borrowFee.deltaUsd),
          className: getPositiveOrNegativeClass(p.borrowFee.deltaUsd, "text-green-500"),
        }
      : undefined;

    const fundingFeeRow = p.fundingFee?.deltaUsd?.abs().gt(0)
      ? {
          id: "fundingFee",
          label: (
            <>
              <div className="text-white">{t`Funding Fee`}:</div>
              <div>({formatPercentage(p.fundingFee.bps.abs())} of collateral)</div>
            </>
          ),
          value: formatDeltaUsd(p.fundingFee.deltaUsd),
          className: getPositiveOrNegativeClass(p.fundingFee.deltaUsd, "text-green-500"),
        }
      : undefined;

    const borrowFeeRateRow = p.borrowFeeRateStr
      ? {
          id: "borrowFeeRate",
          label: <div className="text-white">{t`Borrow Fee Rate`}:</div>,
          value: p.borrowFeeRateStr,
          className: p.borrowFeeRateStr?.startsWith("-") ? "text-red-500" : "text-green-500",
        }
      : undefined;

    const fundingFeeRateRow = p.fundingFeeRateStr
      ? {
          id: "fundingFeeRate",
          label: <div className="text-white">{t`Funding Fee Rate`}:</div>,
          value: p.fundingFeeRateStr,
          className: p.fundingFeeRateStr?.startsWith("-") ? "text-red-500" : "text-green-500",
        }
      : undefined;

    const rebateRow =
      tradingIncentives && rebateIsApplicable
        ? {
            label: (
              <>
                <div className="text-white">{t`Max Bonus Rebate`}:</div>
                <div>
                  <Trans>
                    (up to {formatAmount(tradingIncentives.rebatePercent, 2, 0)}% of {feesTypeName})
                  </Trans>
                </div>
              </>
            ),
            value: formatDeltaUsd(
              p.positionFee?.deltaUsd.mul(tradingIncentives.rebatePercent).div(BASIS_POINTS_DIVISOR).mul(-1)
            ),
            className: "text-green-500",
            id: "rebate",
          }
        : undefined;

    if (p.feesType === "swap") {
      return [swapPriceImpactRow, ...swapFeeRows, uiSwapFeeRow].filter(Boolean) as FeeRow[];
    }

    if (p.feesType === "increase") {
      return [
        positionPriceImpactRow,
        swapPriceImpactRow,
        ...swapFeeRows,
        positionFeeRow,
        rebateRow,
        feeDiscountRow,
        uiFeeRow,
        uiSwapFeeRow,
        borrowFeeRow,
        fundingFeeRow,
        borrowFeeRateRow,
        fundingFeeRateRow,
      ].filter(Boolean) as FeeRow[];
    }

    if (p.feesType === "decrease") {
      return [
        positionPriceImpactRow,
        priceImpactDiffUsd,
        swapPriceImpactRow,
        borrowFeeRow,
        fundingFeeRow,
        positionFeeRow,
        rebateRow,
        feeDiscountRow,
        uiFeeRow,
        uiSwapFeeRow,
        swapProfitFeeRow,
        ...swapFeeRows,
      ].filter(Boolean) as FeeRow[];
    }

    if (p.feesType === "edit") {
      return [borrowFeeRow, fundingFeeRow].filter(Boolean) as FeeRow[];
    }

    return [];
  }, [
    fullPositionPriceImpact,
    p.priceImpactDiff,
    p.swapPriceImpact,
    p.swapFees,
    p.swapProfitFee,
    p.positionFee,
    p.fundingFee,
    p.feesType,
    p.feeDiscountUsd,
    p.borrowFee,
    p.borrowFeeRateStr,
    p.fundingFeeRateStr,
    p.uiFee,
    p.uiSwapFee,
    tradingIncentives,
    rebateIsApplicable,
    chainId,
  ]);

  const totalFeeUsd = useMemo(() => {
    const totalBeforeRebate = p.totalFees?.deltaUsd;

    if (!rebateIsApplicable || !p.positionFee || !tradingIncentives) {
      return totalBeforeRebate;
    }
    const rebate = p.positionFee.deltaUsd.mul(tradingIncentives.rebatePercent).div(BASIS_POINTS_DIVISOR).mul(-1);

    return totalBeforeRebate?.add(rebate);
  }, [p.positionFee, p.totalFees?.deltaUsd, rebateIsApplicable, tradingIncentives]);

  const title = useMemo(() => {
    if (p.feesType !== "swap" && shouldShowRebate && tradingIncentives) {
      return p.feesType === "edit" ? t`Fees (Rebated)` : t`Fees (Rebated) and Price Impact`;
    } else {
      return p.feesType === "edit" ? t`Fees` : t`Fees and Price Impact`;
    }
  }, [p.feesType, shouldShowRebate, tradingIncentives]);

  const incentivesBottomText = useMemo(() => {
    if (!tradingIncentives || !rebateIsApplicable) {
      return null;
    }

    return (
      <Trans>
        The Bonus Rebate will be airdropped as ARB tokens on a pro-rata basis.{" "}
        <ExternalLink
          href="https://gmxio.notion.site/GMX-S-T-I-P-Incentives-Distribution-1a5ab9ca432b4f1798ff8810ce51fec3#9a915e16d33942bdb713f3fe28c3435f"
          newTab
        >
          Read more
        </ExternalLink>
        .
      </Trans>
    );
  }, [rebateIsApplicable, tradingIncentives]);

  const swapRouteMsg = useMemo(() => {
    if (p.swapFees && p.swapFees.length <= 2) return;
    return (
      <>
        <br />
        <Trans>This swap is routed through several GM pools for the lowest possible fees and price impact.</Trans>
      </>
    );
  }, [p.swapFees]);

  let value: ReactNode = useMemo(() => {
    if (!totalFeeUsd || totalFeeUsd.eq(0)) {
      return "-";
    } else if (!feeRows.length && !hasRebates && !incentivesBottomText) {
      return <span className={cx({ positive: totalFeeUsd.gt(0) })}>{formatDeltaUsd(totalFeeUsd)}</span>;
    } else {
      return (
        <TooltipWithPortal
          portalClassName="TradeFeesRow-tooltip"
          handle={<span className={cx({ positive: totalFeeUsd.gt(0) })}>{formatDeltaUsd(totalFeeUsd)}</span>}
          position="top-end"
          renderContent={() => (
            <div>
              {feeRows.map((feeRow) => (
                <StatsTooltipRow
                  key={feeRow.id}
                  className={feeRow.className}
                  label={feeRow.label}
                  value={feeRow.value}
                  showDollar={false}
                />
              ))}
              {hasRebates && (
                <>
                  <br />
                  {rebatesMessage}
                </>
              )}
              {incentivesBottomText && <br />}
              {incentivesBottomText}
              {swapRouteMsg}
            </div>
          )}
        />
      );
    }
  }, [feeRows, hasRebates, incentivesBottomText, rebatesMessage, totalFeeUsd, swapRouteMsg]);

  return <ExchangeInfoRow className="TradeFeesRow" isTop={p.isTop} label={title} value={value} />;
}

function mergePositionPriceImpactWithPriceImpactDiff(
  feesType: TradeFeesType,
  positionPriceImpact: FeeItem | undefined,
  priceImpactDiff: FeeItem | undefined
): [fullPositionPriceImpact: FeeItem | undefined, hasRebates: boolean] {
  if (feesType !== "decrease" || !positionPriceImpact || !priceImpactDiff || priceImpactDiff.deltaUsd.lte(0)) {
    return [positionPriceImpact, false];
  }

  return [
    {
      bps: positionPriceImpact.bps.add(priceImpactDiff.bps.mul(-1)),
      deltaUsd: positionPriceImpact.deltaUsd.add(priceImpactDiff.deltaUsd.mul(-1)),
    },
    true,
  ];
}
