import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useMemo } from "react";

import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { getIncentivesV2Url } from "config/links";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { useTradingIncentives } from "domain/synthetics/common/useIncentiveStats";
import { useTradingAirdroppedTokenTitle } from "domain/synthetics/tokens/useAirdroppedTokenTitle";
import { TradeFees, TradeFeesType } from "domain/synthetics/trade";
import { getIsHighSwapImpact } from "domain/synthetics/trade/utils/warnings";
import { useChainId } from "lib/chains";
import { formatAmount, formatDeltaUsd, formatPercentage } from "lib/numbers";
import { getPositiveOrNegativeClass } from "lib/utils";
import { MARKETS } from "sdk/configs/markets";
import { getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import sparkleIcon from "img/sparkle.svg";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import "./TradeFeesRow.scss";

type Props = TradeFees & {
  shouldShowRebate?: boolean;
  feesType: TradeFeesType | null;
};

type FeeRow = {
  id: string;
  label: ReactNode;
  value: ReactNode;
  className?: string;
};

export function TradeFeesRow(p: Props) {
  const { chainId } = useChainId();
  const tradingIncentives = useTradingIncentives(chainId);
  const incentivesTokenTitle = useTradingAirdroppedTokenTitle();
  const shouldShowRebate = p.shouldShowRebate ?? true;
  const shouldShowWarning = getIsHighSwapImpact(p.swapPriceImpact);
  const showDebugValues = useShowDebugValues();
  const { breakdownNetPriceImpactEnabled } = useSettings();

  const estimatedRebatesPercentage = tradingIncentives?.estimatedRebatePercent ?? 0n;

  const rebateIsApplicable =
    shouldShowRebate && p.positionFee?.deltaUsd !== undefined && p.positionFee.deltaUsd <= 0 && p.feesType !== "swap";

  const feeRows: FeeRow[] = useMemo(() => {
    const swapPriceImpactRow = (
      p.swapPriceImpact?.deltaUsd === undefined ? undefined : bigMath.abs(p.swapPriceImpact?.deltaUsd) > 0
    )
      ? {
          id: "swapPriceImpact",
          label: (
            <>
              <div className="text-typography-primary">{t`Swap Price Impact`}:</div>
              <div>
                (
                {formatPercentage(bigMath.abs(p.swapPriceImpact!.precisePercentage), {
                  displayDecimals: 3,
                  bps: false,
                })}{" "}
                of swap amount)
              </div>
            </>
          ),
          value: formatDeltaUsd(p.swapPriceImpact!.deltaUsd),
          className: getPositiveOrNegativeClass(p.swapPriceImpact!.deltaUsd, "text-green-500"),
        }
      : undefined;

    const externalSwapFeeRow =
      p.externalSwapFee && p.externalSwapFee.deltaUsd !== undefined && p.externalSwapFee.deltaUsd !== 0n
        ? {
            id: `external-swap-${p.externalSwapFee.tokenInAddress}-${p.externalSwapFee.tokenOutAddress}`,
            label: (
              <>
                <div className="text-typography-primary">
                  {t`External Swap ${getToken(chainId, p.externalSwapFee.tokenInAddress).symbol} to ${
                    getToken(chainId, p.externalSwapFee.tokenOutAddress).symbol
                  }`}
                  :
                </div>
                <div>
                  (
                  {formatPercentage(bigMath.abs(p.externalSwapFee.precisePercentage), {
                    displayDecimals: 3,
                    bps: false,
                  })}{" "}
                  of swap amount)
                </div>
              </>
            ),
            value: formatDeltaUsd(p.externalSwapFee.deltaUsd),
            className: getPositiveOrNegativeClass(p.externalSwapFee.deltaUsd, "text-green-500"),
          }
        : undefined;

    const swapFeeRows: FeeRow[] =
      p.swapFees?.map((swap) => ({
        id: `swap-${swap.tokenInAddress}-${swap.tokenOutAddress}`,
        label: (
          <>
            <div className="text-typography-primary">
              <Trans>
                Swap {getToken(chainId, swap.tokenInAddress).symbol} to {getToken(chainId, swap.tokenOutAddress).symbol}
              </Trans>
              {showDebugValues && (
                <span className="text-typography-secondary">
                  {" "}
                  in {getToken(chainId, MARKETS[chainId][swap.marketAddress].indexTokenAddress).symbol}
                </span>
              )}
              :
            </div>
            <div>
              (
              {formatPercentage(bigMath.abs(swap.precisePercentage), {
                displayDecimals: 3,
                bps: false,
              })}{" "}
              of swap amount)
            </div>
          </>
        ),
        value: formatDeltaUsd(swap.deltaUsd),
        className: getPositiveOrNegativeClass(swap.deltaUsd, "text-green-500"),
      })) || [];

    const swapProfitFeeRow =
      p.swapProfitFee?.deltaUsd !== undefined && p.swapProfitFee?.deltaUsd !== 0n
        ? {
            id: "swapProfitFee",
            label: (
              <>
                <div className="text-typography-primary">{t`Swap Profit Fee`}:</div>
                <div>
                  (
                  {formatPercentage(
                    p.swapProfitFee?.precisePercentage === undefined
                      ? undefined
                      : bigMath.abs(p.swapProfitFee.precisePercentage),
                    {
                      displayDecimals: 3,
                      bps: false,
                    }
                  )}{" "}
                  of swap amount)
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
              <div className="text-typography-primary">{feesTypeName}:</div>
              <div>
                (
                {formatPercentage(bigMath.abs(p.positionFee!.precisePercentage), {
                  displayDecimals: 3,
                  bps: false,
                })}{" "}
                of position size)
              </div>
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
              <div className="text-typography-primary">{t`UI Fee`}:</div>
              <div>
                (
                {formatPercentage(bigMath.abs(p!.uiFee!.precisePercentage), {
                  displayDecimals: 3,
                  bps: false,
                })}{" "}
                of {p.feesType === "swap" ? "swap amount" : "position size"})
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
                <div className="text-typography-primary">{p.feesType === "swap" ? t`UI Fee` : t`Swap UI Fee`}:</div>
                <div>
                  (
                  {formatPercentage(bigMath.abs(p.uiSwapFee.precisePercentage), {
                    displayDecimals: 3,
                    bps: false,
                  })}{" "}
                  of swap amount)
                </div>
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
            <div className="text-typography-primary">
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
            label: <div className="text-typography-primary">{t`Borrow Fee`}:</div>,
            value: formatDeltaUsd(p.borrowFee.deltaUsd),
            className: getPositiveOrNegativeClass(p.borrowFee.deltaUsd, "text-green-500"),
          }
        : undefined;

    const fundingFeeRow =
      p.fundingFee && (p.fundingFee?.deltaUsd === undefined ? undefined : bigMath.abs(p.fundingFee.deltaUsd) > 0)
        ? {
            id: "fundingFee",
            label: <div>{t`Funding Fee`}:</div>,
            value: formatDeltaUsd(p.fundingFee.deltaUsd),
            className: getPositiveOrNegativeClass(p.fundingFee.deltaUsd, "text-green-500"),
          }
        : undefined;

    const proportionalPendingImpactDeltaUsdRow =
      breakdownNetPriceImpactEnabled &&
      (p.proportionalPendingImpact?.deltaUsd !== undefined && p.proportionalPendingImpact.deltaUsd !== 0n
        ? {
            id: "proportionalPendingImpactDeltaUsd",
            label: (
              <>
                <div className="text-typography-primary">
                  <Trans>Proportional Stored Impact</Trans>:
                </div>
                <div>
                  (
                  {formatPercentage(bigMath.abs(p.proportionalPendingImpact.precisePercentage), {
                    displayDecimals: 3,
                    bps: false,
                  })}{" "}
                  of position size)
                </div>
              </>
            ),
            value: formatDeltaUsd(p.proportionalPendingImpact.deltaUsd),
            className: getPositiveOrNegativeClass(p.proportionalPendingImpact.deltaUsd, "text-green-500"),
          }
        : undefined);

    const closePriceImpactDeltaUsdRow =
      breakdownNetPriceImpactEnabled &&
      (p.decreasePositionPriceImpact?.deltaUsd !== undefined && p.decreasePositionPriceImpact.deltaUsd !== 0n
        ? {
            id: "closePriceImpactDeltaUsd",
            label: (
              <>
                <div className="text-typography-primary">{t`Close Price Impact`}:</div>
                <div>
                  (
                  {formatPercentage(bigMath.abs(p.decreasePositionPriceImpact.precisePercentage), {
                    displayDecimals: 3,
                    bps: false,
                  })}{" "}
                  of position size)
                </div>
              </>
            ),
            value: formatDeltaUsd(p.decreasePositionPriceImpact.deltaUsd),
            className: getPositiveOrNegativeClass(p.decreasePositionPriceImpact.deltaUsd, "text-green-500"),
          }
        : undefined);

    const netPriceImpactRow =
      p.totalPendingImpact?.deltaUsd !== undefined && p.totalPendingImpact.deltaUsd !== 0n
        ? {
            id: "netPriceImpact",
            label: (
              <>
                <div className="text-typography-primary">{t`Net Price Impact`}:</div>
                <div>
                  (
                  {formatPercentage(bigMath.abs(p.totalPendingImpact.precisePercentage), {
                    displayDecimals: 3,
                    bps: false,
                  })}{" "}
                  of position size)
                </div>
              </>
            ),
            value: formatDeltaUsd(p.totalPendingImpact.deltaUsd),
            className: getPositiveOrNegativeClass(p.totalPendingImpact.deltaUsd, "text-green-500"),
          }
        : undefined;

    const priceImpactRebatesRow =
      p.priceImpactDiff?.deltaUsd !== undefined && p.priceImpactDiff.deltaUsd !== 0n
        ? {
            id: "priceImpactDiff",
            label: (
              <>
                <div className="text-typography-primary">{t`Price Impact Rebates`}:</div>
                <div>
                  (
                  {formatPercentage(bigMath.abs(p.priceImpactDiff.precisePercentage), {
                    displayDecimals: 3,
                    bps: false,
                  })}{" "}
                  of position size)
                </div>
              </>
            ),
            value: formatDeltaUsd(p.priceImpactDiff.deltaUsd),
            className: getPositiveOrNegativeClass(p.priceImpactDiff.deltaUsd, "text-green-500"),
          }
        : undefined;

    const rebateRow =
      tradingIncentives && rebateIsApplicable
        ? {
            label: (
              <>
                <div className="text-typography-primary">
                  <span className="relative">
                    <Trans>Bonus Rebate</Trans>
                    <img className="absolute -right-11 -top-1 h-7" src={sparkleIcon} alt="sparkle" />
                  </span>
                  :
                </div>
                <div>
                  ({formatAmount(estimatedRebatesPercentage, 2, 0)}%{" "}
                  {p.feesType === "increase" ? t`of open fee` : t`of close fee`})
                </div>
              </>
            ),
            value: formatDeltaUsd(
              p.positionFee &&
                bigMath.mulDiv(p.positionFee.deltaUsd, estimatedRebatesPercentage, BASIS_POINTS_DIVISOR_BIGINT) * -1n
            ),
            className: "text-green-500",
            id: "rebate",
          }
        : undefined;

    if (p.feesType === "swap") {
      return [swapPriceImpactRow, externalSwapFeeRow, ...swapFeeRows, uiSwapFeeRow].filter(Boolean) as FeeRow[];
    }

    if (p.feesType === "increase") {
      return [
        swapPriceImpactRow,
        externalSwapFeeRow,
        ...swapFeeRows,
        positionFeeRow,
        rebateRow,
        feeDiscountRow,
        uiFeeRow,
        uiSwapFeeRow,
        borrowFeeRow,
        fundingFeeRow,
      ].filter(Boolean) as FeeRow[];
    }

    if (p.feesType === "decrease") {
      return [
        proportionalPendingImpactDeltaUsdRow,
        closePriceImpactDeltaUsdRow,
        netPriceImpactRow,
        priceImpactRebatesRow,
        borrowFeeRow,
        fundingFeeRow,
        positionFeeRow,
        rebateRow,
        feeDiscountRow,
        uiFeeRow,
        uiSwapFeeRow,
        swapProfitFeeRow,
        swapPriceImpactRow,
        ...swapFeeRows,
      ].filter(Boolean) as FeeRow[];
    }

    if (p.feesType === "edit") {
      return [borrowFeeRow, fundingFeeRow].filter(Boolean) as FeeRow[];
    }

    return [];
  }, [
    p,
    chainId,
    tradingIncentives,
    rebateIsApplicable,
    estimatedRebatesPercentage,
    showDebugValues,
    breakdownNetPriceImpactEnabled,
  ]);

  const totalFeeUsd = useMemo(() => {
    const totalBeforeRebate = p.totalFees?.deltaUsd;

    if (!rebateIsApplicable || !p.positionFee || !tradingIncentives) {
      return totalBeforeRebate;
    }
    const rebate =
      bigMath.mulDiv(p.positionFee.deltaUsd, estimatedRebatesPercentage, BASIS_POINTS_DIVISOR_BIGINT) * -1n;

    return totalBeforeRebate === undefined ? undefined : totalBeforeRebate + rebate;
  }, [p.positionFee, p.totalFees?.deltaUsd, rebateIsApplicable, tradingIncentives, estimatedRebatesPercentage]);

  const title = useMemo(() => {
    let text = t`Fees`;

    if (p.feesType !== "swap" && p.swapFees && p.swapFees.length > 0) {
      text = t`Fees (Incl. Swap)`;
    }

    if (p.feesType !== "swap" && shouldShowRebate && tradingIncentives) {
      const rebatedTextWithSparkle = (
        <span className="relative">
          <Trans>(Rebated)</Trans>
          <img className="absolute -right-6 -top-1 h-7" src={sparkleIcon} alt="sparkle" />
        </span>
      );

      return (
        <>
          {text} {rebatedTextWithSparkle}
        </>
      );
    } else {
      return text;
    }
  }, [p.feesType, p.swapFees, shouldShowRebate, tradingIncentives]);

  const incentivesBottomText = useMemo(() => {
    if (!incentivesTokenTitle || !rebateIsApplicable) {
      return null;
    }

    return (
      <Trans>
        The bonus rebate is an estimate and can be up to {formatAmount(tradingIncentives?.maxRebatePercent, 2, 0)}% of
        the open fee. It will be airdropped as {incentivesTokenTitle} tokens on a pro-rata basis.{" "}
        <span className="whitespace-nowrap">
          <ExternalLink href={getIncentivesV2Url(chainId)} newTab>
            Read more
          </ExternalLink>
          .
        </span>
      </Trans>
    );
  }, [chainId, incentivesTokenTitle, rebateIsApplicable, tradingIncentives?.maxRebatePercent]);

  const priceImpactRebatesInfo = useMemo(() => {
    if (p.priceImpactDiff?.deltaUsd === undefined || p.priceImpactDiff.deltaUsd === 0n) {
      return null;
    }

    return (
      <Trans>
        Price impact rebates for closing trades are claimable under the claims tab.{" "}
        <ExternalLink href={"https://docs.gmx.io/docs/trading/v2#price-impact-rebates"} newTab>
          Read more
        </ExternalLink>
      </Trans>
    );
  }, [p.priceImpactDiff?.deltaUsd]);

  const swapRouteMsg = useMemo(() => {
    if (p.swapFees && p.swapFees.length <= 2) {
      return null;
    }

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
    } else if (!feeRows.length && !incentivesBottomText) {
      return (
        <span
          className={cx({
            "text-green-500": totalFeeUsd > 0 && !shouldShowWarning,
            "text-yellow-300": shouldShowWarning,
          })}
        >
          {formatDeltaUsd(totalFeeUsd)}
        </span>
      );
    } else {
      return (
        <TooltipWithPortal
          tooltipClassName="TradeFeesRow-tooltip"
          handleClassName={cx({
            "text-green-500": totalFeeUsd > 0 && !shouldShowWarning,
            "text-yellow-300 !decoration-yellow-300/50": shouldShowWarning,
          })}
          handle={formatDeltaUsd(totalFeeUsd)}
          position="left-start"
          content={
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
              {incentivesBottomText && (
                <div>
                  <br />
                  {incentivesBottomText}
                </div>
              )}
              {priceImpactRebatesInfo && (
                <div>
                  <br />
                  {priceImpactRebatesInfo}
                </div>
              )}
              {swapRouteMsg && (
                <div>
                  <br />
                  {swapRouteMsg}
                </div>
              )}
            </div>
          }
        />
      );
    }
  }, [totalFeeUsd, feeRows, incentivesBottomText, shouldShowWarning, priceImpactRebatesInfo, swapRouteMsg]);

  return <SyntheticsInfoRow label={title} value={value} />;
}
