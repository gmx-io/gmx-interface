import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getToken } from "config/tokens";
import { ExecutionFee, FeeItem, SwapFeeItem } from "domain/synthetics/fees";
import { TradeFeesType } from "domain/synthetics/trade";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { formatDeltaUsd, formatPercentage, formatTokenAmountWithUsd } from "lib/numbers";
import { ReactNode, useMemo } from "react";
import "./TradeFeesRow.scss";

type Props = {
  totalFees?: FeeItem;
  swapFees?: SwapFeeItem[];
  swapProfitFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  positionFee?: FeeItem;
  positionPriceImpact?: FeeItem;
  executionFee?: ExecutionFee;
  borrowFee?: FeeItem;
  fundingFee?: FeeItem;
  borrowFeeRateStr?: string;
  fundingFeeRateStr?: string;
  feeDiscountUsd?: BigNumber;
  isTop?: boolean;
  feesType: TradeFeesType;
  warning?: string;
};

type FeeRow = {
  id: string;
  label: ReactNode;
  value: ReactNode;
  className?: string;
};

export function TradeFeesRow(p: Props) {
  const { chainId } = useChainId();

  const feeRows: FeeRow[] = useMemo(() => {
    const positionPriceImpactRow = p.positionPriceImpact?.deltaUsd.abs().gt(0)
      ? {
          id: "positionPriceImpact",
          label: (
            <>
              <div className="text-white">{t`Position Price Impact`}:</div>
              <div>({formatPercentage(p.positionPriceImpact.bps.abs())} of position size)</div>
            </>
          ),
          value: formatDeltaUsd(p.positionPriceImpact.deltaUsd),
          className: p.positionPriceImpact.deltaUsd.gte(0) ? "text-green" : "text-red",
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
          className: p.swapPriceImpact.deltaUsd.gte(0) ? "text-green" : "text-red",
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
        className: swap.deltaUsd.gte(0) ? "text-green" : "text-red",
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
          className: p.swapProfitFee.deltaUsd.gte(0) ? "text-green" : "text-red",
        }
      : undefined;

    const positionFeeRow = p.positionFee?.deltaUsd.abs().gt(0)
      ? {
          id: "positionFee",
          label: (
            <>
              <div className="text-white">{p.feesType === "increase" ? t`Open Fee` : t`Close Fee`}:</div>
              <div>({formatPercentage(p.positionFee.bps.abs())} of position size)</div>
            </>
          ),
          value: formatDeltaUsd(p.positionFee.deltaUsd),
          className: p.positionFee.deltaUsd.gte(0) ? "text-green" : "text-red",
        }
      : undefined;

    const feeDiscountRow = p.feeDiscountUsd?.gt(0)
      ? {
          id: "feeDiscount",
          label: (
            <div className="text-white">
              <Trans>Referral Discount</Trans>
            </div>
          ),
          value: formatDeltaUsd(p.feeDiscountUsd),
          className: "text-green",
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
          className: p.borrowFee.deltaUsd.gte(0) ? "text-green" : "text-red",
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
          className: p.fundingFee.deltaUsd.gte(0) ? "text-green" : "text-red",
        }
      : undefined;

    const borrowFeeRateRow = p.borrowFeeRateStr
      ? {
          id: "borrowFeeRate",
          label: <div className="text-white">{t`Borrow Fee Rate`}</div>,
          value: p.borrowFeeRateStr,
          className: p.borrowFeeRateStr?.startsWith("-") ? "text-red" : "text-green",
        }
      : undefined;

    const fundingFeeRateRow = p.fundingFeeRateStr
      ? {
          id: "fundingFeeRate",
          label: <div className="text-white">{t`Funding Fee Rate`}</div>,
          value: p.fundingFeeRateStr,
          className: p.fundingFeeRateStr?.startsWith("-") ? "text-red" : "text-green",
        }
      : undefined;

    const executionFeeRow = p.executionFee?.feeTokenAmount.gt(0)
      ? {
          label: <div className="text-white">{t`Max Execution Fee`}</div>,
          value: formatTokenAmountWithUsd(
            p.executionFee.feeTokenAmount.mul(-1),
            p.executionFee.feeUsd.mul(-1),
            p.executionFee.feeToken.symbol,
            p.executionFee.feeToken.decimals
          ),
          className: "text-red",
        }
      : undefined;

    if (p.feesType === "swap") {
      return [swapPriceImpactRow, ...swapFeeRows, executionFeeRow].filter(Boolean) as FeeRow[];
    }

    if (p.feesType === "increase") {
      return [
        positionPriceImpactRow,
        swapPriceImpactRow,
        ...swapFeeRows,
        positionFeeRow,
        feeDiscountRow,
        borrowFeeRow,
        fundingFeeRow,
        borrowFeeRateRow,
        fundingFeeRateRow,
        executionFeeRow,
      ].filter(Boolean) as FeeRow[];
    }

    if (p.feesType === "decrease") {
      return [
        positionPriceImpactRow,
        swapPriceImpactRow,
        borrowFeeRow,
        fundingFeeRow,
        positionFeeRow,
        feeDiscountRow,
        swapProfitFeeRow,
        ...swapFeeRows,
        executionFeeRow,
      ].filter(Boolean) as FeeRow[];
    }

    if (p.feesType === "edit") {
      return [borrowFeeRow, fundingFeeRow, executionFeeRow].filter(Boolean) as FeeRow[];
    }

    return [];
  }, [
    p.positionPriceImpact,
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
    p.executionFee,
    chainId,
  ]);

  const totalFeeUsd = useMemo(() => {
    return p.totalFees?.deltaUsd.sub(p.executionFee?.feeUsd || 0);
  }, [p.executionFee, p.totalFees]);

  const title = p.feesType === "edit" ? t`Fees` : t`Fees and Price Impact`;

  return (
    <ExchangeInfoRow
      className="TradeFeesRow"
      isTop={p.isTop}
      label={
        p.warning ? (
          <Tooltip
            position="left-top"
            className="TradeFeesRow-warning-tooltip"
            handle={title}
            renderContent={() => p.warning}
          />
        ) : (
          title
        )
      }
      value={
        <>
          {!totalFeeUsd || totalFeeUsd.eq(0) ? (
            "-"
          ) : (
            <Tooltip
              className="TradeFeesRow-tooltip"
              handle={<span className={cx({ positive: totalFeeUsd.gt(0) })}>{formatDeltaUsd(totalFeeUsd)}</span>}
              position="right-top"
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
                </div>
              )}
            />
          )}
        </>
      }
    />
  );
}
