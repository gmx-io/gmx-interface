import { Trans, t } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { BASIS_POINTS_DIVISOR } from "config/factors";
import { useExecutionFeeBufferBps } from "context/SyntheticsStateContext/hooks/settingsHooks";
import type { ExecutionFee } from "domain/synthetics/fees/types";
import { formatTokenAmountWithUsd, formatUsd, roundToTwoDecimals } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import "./NetworkFeeRow.scss";

type Props = {
  executionFee?: ExecutionFee;
};

export function NetworkFeeRow({ executionFee }: Props) {
  const executionFeeBufferBps = useExecutionFeeBufferBps();

  const maxExecutionFeeText = useMemo(() => {
    if (executionFeeBufferBps !== undefined) {
      const bps = executionFeeBufferBps;
      return roundToTwoDecimals((bps / BASIS_POINTS_DIVISOR) * 100);
    }
  }, [executionFeeBufferBps]);

  const executionFeeText = useMemo(
    () =>
      formatTokenAmountWithUsd(
        executionFee?.feeTokenAmount.mul(-1),
        executionFee?.feeUsd.mul(-1),
        executionFee?.feeToken.symbol,
        executionFee?.feeToken.decimals
      ),
    [executionFee]
  );

  const value: ReactNode = useMemo(() => {
    if (!executionFee?.feeUsd) {
      return "-";
    }

    return (
      <TooltipWithPortal
        portalClassName="NetworkFeeRow-tooltip"
        position="right-top"
        renderContent={() => (
          <StatsTooltipRow label={t`Max Execution Fee`} showDollar={false} value={executionFeeText} />
        )}
      >
        {formatUsd(executionFee?.feeUsd.mul(-1))}
      </TooltipWithPortal>
    );
  }, [executionFee?.feeUsd, executionFeeText]);

  return (
    <ExchangeInfoRow
      label={
        <TooltipWithPortal
          position="left-top"
          renderContent={() => (
            <div>
              <Trans>
                Maximum execution fee paid to the network. This fee is a blockchain cost not specific to GMX, and it
                does not impact your collateral.
              </Trans>
              <br />
              <br />
              <div className="text-white">
                <Trans>
                  The max execution fee is overestimated by {maxExecutionFeeText}%. Upon execution, the excess execution
                  fee is sent back to your account.
                </Trans>
                <ExternalLink href="https://docs.gmx.io/docs/trading/v2#execution-fee">
                  <Trans>Read more</Trans>
                </ExternalLink>
                .
              </div>
              <br />
              {executionFee?.warning && <div className="text-warning">{executionFee?.warning}</div>}
            </div>
          )}
        >
          <Trans>Network Fee</Trans>
        </TooltipWithPortal>
      }
      value={value}
    />
  );
}
