import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useMemo } from "react";

import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
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

import { bigMath } from "lib/bigmath";
import "./TradeFeesRow.scss";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { INCENTIVES_V2_URL } from "config/ui";
import sparkleIcon from "img/sparkle.svg";

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
  feeDiscountUsd?: bigint;
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
  const tokensData = useTokensData();
  const tradingIncentives = useTradingIncentives(tokensData);
  const shouldShowRebate = p.shouldShowRebate ?? true;
  const rebateIsApplicable =
    shouldShowRebate && p.positionFee?.deltaUsd && p.positionFee.deltaUsd < 0 && p.feesType !== "swap";

  const hasRebates =
    p.feesType !== "decrease" || !p.positionPriceImpact || !p.priceImpactDiff || p.priceImpactDiff.deltaUsd <= 0;

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
    const swapPriceImpactRow = (
      p.swapPriceImpact?.deltaUsd === undefined ? undefined : bigMath.abs(p.swapPriceImpact?.deltaUsd) > 0
    )
      ? {
          id: "swapPriceImpact",
          label: (
            <>
              <div className="text-white">{t`Swap Price Impact`}:</div>
              <div>({formatPercentage(bigMath.abs(p.swapPriceImpact!.bps))} of swap amount)</div>
            </>
          ),
          value: formatDeltaUsd(p.swapPriceImpact!.deltaUsd),
          className: getPositiveOrNegativeClass(p.swapPriceImpact!.deltaUsd, "text-green-500"),
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
            <div>({formatPercentage(bigMath.abs(swap.bps))} of swap amount)</div>
          </>
        ),
        value: formatDeltaUsd(swap.deltaUsd),
        className: getPositiveOrNegativeClass(swap.deltaUsd, "text-green-500"),
      })) || [];

    const swapProfitFeeRow = (p.swapProfitFee?.deltaUsd === undefined ? undefined : p.swapProfitFee?.deltaUsd !== 0n)
      ? {
          id: "swapProfitFee",
          label: (
            <>
              <div className="text-white">{t`Swap Profit Fee`}:</div>
              <div>
                ({formatPercentage(p.swapProfitFee?.bps === undefined ? undefined : bigMath.abs(p.swapProfitFee.bps))}{" "}
                of collateral)
              </div>
            </>
          ),
          value: formatDeltaUsd(p.swapProfitFee?.deltaUsd),
          className: getPositiveOrNegativeClass(p.swapProfitFee?.deltaUsd, "text-green-500"),
        }
      : undefined;

    const feesTypeName = p.feesType === "increase" ? t`Open Fee` : t`Close Fee`;
    const positionFeeRow = (p.positionFee?.deltaUsd === undefined ? undefined : p.positionFee?.deltaUsd !== 0n)
      ? {
          id: "positionFee",
          label: (
            <>
              <div className="text-white">{feesTypeName}:</div>
              <div>({formatPercentage(bigMath.abs(p.positionFee!.bps))} of position size)</div>
            </>
          ),
          value: formatDeltaUsd(p.positionFee?.deltaUsd),
          className: getPositiveOrNegativeClass(p.positionFee?.deltaUsd, "text-green-500"),
        }
      : undefined;

    const uiFeeRow = (p.uiFee?.deltaUsd === undefined ? undefined : p.uiFee.deltaUsd !== 0n)
      ? {
          id: "uiFee",
          label: (
            <>
              <div className="text-white">{t`UI Fee`}:</div>
              <div>
                ({formatPercentage(bigMath.abs(p!.uiFee!.bps))} of{" "}
                {p.feesType === "swap" ? "swap amount" : "position size"})
              </div>
            </>
          ),
          value: formatDeltaUsd(p.uiFee?.deltaUsd),
          className: "text-red-500",
        }
      : undefined;

    const uiSwapFeeRow =
      p.uiSwapFee && (p.uiSwapFee?.deltaUsd === undefined ? undefined : p.uiSwapFee.deltaUsd !== 0n)
        ? {
            id: "swapUiFee",
            label: (
              <>
                <div className="text-white">{p.feesType === "swap" ? t`UI Fee` : t`Swap UI Fee`}:</div>
                <div>({formatPercentage(bigMath.abs(p.uiSwapFee.bps))} of swap amount)</div>
              </>
            ),
            value: formatDeltaUsd(p.uiSwapFee.deltaUsd),
            className: "text-red-500",
          }
        : undefined;

    const feeDiscountRow = (p.feeDiscountUsd === undefined ? undefined : p.feeDiscountUsd !== 0n)
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

    const borrowFeeRow =
      p.borrowFee && (p.borrowFee?.deltaUsd === undefined ? undefined : p.borrowFee.deltaUsd !== 0n)
        ? {
            id: "borrowFee",
            label: (
              <>
                <div className="text-white">{t`Borrow Fee`}:</div>
                <div>({formatPercentage(bigMath.abs(p.borrowFee.bps))} of collateral)</div>
              </>
            ),
            value: formatDeltaUsd(p.borrowFee.deltaUsd),
            className: getPositiveOrNegativeClass(p.borrowFee.deltaUsd, "text-green-500"),
          }
        : undefined;

    const fundingFeeRow =
      p.fundingFee && (p.fundingFee?.deltaUsd === undefined ? undefined : bigMath.abs(p.fundingFee.deltaUsd) > 0)
        ? {
            id: "fundingFee",
            label: (
              <>
                <div className="text-white">{t`Funding Fee`}:</div>
                <div>({formatPercentage(bigMath.abs(p.fundingFee.bps))} of collateral)</div>
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
                <div className="text-white">
                  <span className="relative">
                    <Trans>Max Bonus Rebate</Trans>
                    <img className="absolute -right-11 -top-1 h-7" src={sparkleIcon} alt="sparkle" />
                  </span>
                  :
                </div>
                <div>
                  <Trans>
                    (up to {formatAmount(tradingIncentives.rebatePercent, 2, 0)}% of {feesTypeName})
                  </Trans>
                </div>
              </>
            ),
            value: formatDeltaUsd(
              p.positionFee &&
                bigMath.mulDiv(p.positionFee.deltaUsd, tradingIncentives.rebatePercent, BASIS_POINTS_DIVISOR_BIGINT) *
                  -1n
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
  }, [p, tradingIncentives, rebateIsApplicable, chainId]);

  const totalFeeUsd = useMemo(() => {
    const totalBeforeRebate = p.totalFees?.deltaUsd;

    if (!rebateIsApplicable || !p.positionFee || !tradingIncentives) {
      return totalBeforeRebate;
    }
    const rebate =
      bigMath.mulDiv(p.positionFee.deltaUsd, tradingIncentives.rebatePercent, BASIS_POINTS_DIVISOR_BIGINT) * -1n;

    return totalBeforeRebate === undefined ? undefined : totalBeforeRebate + rebate;
  }, [p.positionFee, p.totalFees?.deltaUsd, rebateIsApplicable, tradingIncentives]);

  const title = useMemo(() => {
    if (p.feesType !== "swap" && shouldShowRebate && tradingIncentives) {
      const rebatedTextWithSparkle = (
        <span className="relative">
          <Trans>(Rebated)</Trans>
          <img className="absolute -right-6 -top-1 h-7" src={sparkleIcon} alt="sparkle" />
        </span>
      );

      return (
        <Trans>Fees {rebatedTextWithSparkle}</Trans>
      );
    } else {
      return t`Fees`;
    }
  }, [p.feesType, shouldShowRebate, tradingIncentives]);

  const incentivesBottomText = useMemo(() => {
    if (!tradingIncentives || !rebateIsApplicable) {
      return null;
    }

    return (
      <Trans>
        The Bonus Rebate will be airdropped as {tradingIncentives.token?.symbol ?? ""} tokens on a pro-rata basis.{" "}
        <span className="whitespace-nowrap">
          <ExternalLink href={INCENTIVES_V2_URL} newTab>
            Read more
          </ExternalLink>
          .
        </span>
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
    if (totalFeeUsd === undefined || totalFeeUsd == 0n) {
      return "-";
    } else if (!feeRows.length && !hasRebates && !incentivesBottomText) {
      return <span className={cx({ positive: totalFeeUsd > 0 })}>{formatDeltaUsd(totalFeeUsd)}</span>;
    } else {
      return (
        <TooltipWithPortal
          portalClassName="TradeFeesRow-tooltip"
          handle={<span className={cx({ positive: totalFeeUsd > 0 })}>{formatDeltaUsd(totalFeeUsd)}</span>}
          position="top-end"
          renderContent={() => (
            <div>
              {feeRows.map((feeRow) => (
                <StatsTooltipRow
                  key={feeRow.id}
                  textClassName={feeRow.className}
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
