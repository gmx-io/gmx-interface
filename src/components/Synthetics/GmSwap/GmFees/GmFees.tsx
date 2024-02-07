import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { ExecutionFee, FeeItem } from "domain/synthetics/fees";
import { formatDeltaUsd, formatTokenAmountWithUsd, roundToTwoDecimals } from "lib/numbers";
import "./GmFees.scss";
import { getPositiveOrNegativeClass } from "lib/utils";
import { useMemo } from "react";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { useExecutionFeeBufferBps } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { BASIS_POINTS_DIVISOR } from "config/factors";

type Props = {
  totalFees?: FeeItem;
  swapFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  uiFee?: FeeItem;
  executionFee?: ExecutionFee;
  isDeposit: boolean;
};

export function GmFees(p: Props) {
  const executionFeeBufferBps = useExecutionFeeBufferBps();
  const totalFeesUsd = p.totalFees?.deltaUsd.sub(p.executionFee?.feeUsd || 0);

  const maxExecutionFeeText = useMemo(() => {
    if (executionFeeBufferBps !== undefined) {
      const bps = executionFeeBufferBps;
      return roundToTwoDecimals((bps / BASIS_POINTS_DIVISOR) * 100);
    }
  }, [executionFeeBufferBps]);

  const label = useMemo(() => {
    const text = <Trans>Fees and Price Impact</Trans>;
    return (
      <Tooltip
        position="left-top"
        handle={text}
        renderContent={() => (
          <>
            {p.executionFee?.warning && (
              <span className="text-white">
                {p.executionFee?.warning} <br />
                <br />
              </span>
            )}
            <div className="text-white">
              <Trans>
                The Max Execution Fee is overestimated by {maxExecutionFeeText}%. Upon execution, the excess Execution
                Fee is sent back to your account.
              </Trans>
              <ExternalLink href="https://docs.gmx.io/docs/trading/v2#execution-fee">Read more</ExternalLink>.
            </div>
          </>
        )}
      />
    );
  }, [maxExecutionFeeText, p.executionFee?.warning]);

  return (
    <ExchangeInfoRow
      label={label}
      value={
        <>
          {!p.totalFees?.deltaUsd && "-"}
          {p.totalFees?.deltaUsd && (
            <Tooltip
              className="GmFees-tooltip"
              handle={<span className={cx({ positive: totalFeesUsd?.gt(0) })}>{formatDeltaUsd(totalFeesUsd)}</span>}
              position="right-top"
              renderContent={() => (
                <div>
                  {p.swapPriceImpact?.deltaUsd.abs().gt(0) && (
                    <StatsTooltipRow
                      label={t`Price Impact`}
                      value={formatDeltaUsd(p.swapPriceImpact.deltaUsd, p.swapPriceImpact.bps)!}
                      showDollar={false}
                      className={getPositiveOrNegativeClass(p.swapPriceImpact.deltaUsd)}
                    />
                  )}

                  {p.swapFee && (
                    <>
                      <StatsTooltipRow
                        label={p.isDeposit ? t`Buy Fee` : t`Sell Fee`}
                        value={formatDeltaUsd(p.swapFee.deltaUsd, p.swapFee.bps)!}
                        showDollar={false}
                        className={getPositiveOrNegativeClass(p.swapFee.deltaUsd)}
                      />
                    </>
                  )}

                  {p.uiFee?.deltaUsd.abs()?.gt(0) && (
                    <StatsTooltipRow
                      label={
                        <>
                          <Trans>UI Fee</Trans>:
                        </>
                      }
                      value={formatDeltaUsd(p.uiFee.deltaUsd, p.uiFee.bps)!}
                      showDollar={false}
                      className="text-red"
                    />
                  )}
                  {p.executionFee && (
                    <StatsTooltipRow
                      label={t`Max Execution Fee`}
                      value={formatTokenAmountWithUsd(
                        p.executionFee.feeTokenAmount.mul(-1),
                        p.executionFee.feeUsd.mul(-1),
                        p.executionFee.feeToken.symbol,
                        p.executionFee.feeToken.decimals
                      )}
                      showDollar={false}
                    />
                  )}
                </div>
              )}
            />
          )}
        </>
      }
    />
  );
}
