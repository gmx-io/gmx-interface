import { Trans, t } from "@lingui/macro";
import { BigNumber } from "ethers";
import { ReactNode, useMemo } from "react";

import { BASIS_POINTS_DIVISOR } from "config/factors";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useExecutionFeeBufferBps } from "context/SyntheticsStateContext/hooks/settingsHooks";
import type { ExecutionFee } from "domain/synthetics/fees/types";
import { convertToUsd } from "domain/synthetics/tokens/utils";
import { formatTokenAmountWithUsd, formatUsd } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import "./NetworkFeeRow.scss";

type Props = {
  executionFee?: ExecutionFee;
};

/**
 * This is not an accurate refund ration, just an estimation based on the recent data.
 * 10%
 */
const ESTIMATED_REFUND_BPS = 10 * 100;

export function NetworkFeeRow({ executionFee }: Props) {
  const executionFeeBufferBps = useExecutionFeeBufferBps();
  const tokenData = useTokensData();

  const { executionFeeText, estimatedRefundText } = useMemo(() => {
    const executionFeeText = formatTokenAmountWithUsd(
      executionFee?.feeTokenAmount.mul(-1),
      executionFee?.feeUsd.mul(-1),
      executionFee?.feeToken.symbol,
      executionFee?.feeToken.decimals
    );

    let estimatedRefundTokenAmount: BigNumber | undefined;
    if (!executionFee || executionFeeBufferBps === undefined) {
      estimatedRefundTokenAmount = undefined;
    } else {
      const fee = executionFee.feeTokenAmount;
      const feeBeforeBuffer = fee.mul(BASIS_POINTS_DIVISOR).div(BASIS_POINTS_DIVISOR + executionFeeBufferBps);
      estimatedRefundTokenAmount = feeBeforeBuffer
        .mul(ESTIMATED_REFUND_BPS)
        .div(BASIS_POINTS_DIVISOR)
        .add(fee.sub(feeBeforeBuffer));
    }

    let estimatedRefundUsd: BigNumber | undefined;

    if (executionFeeBufferBps === undefined || !executionFee || !tokenData) {
      estimatedRefundUsd = undefined;
    } else {
      estimatedRefundUsd = convertToUsd(
        estimatedRefundTokenAmount,
        executionFee.feeToken.decimals,
        tokenData[executionFee.feeToken.address].prices.minPrice
      );
    }
    const estimatedRefundText = formatTokenAmountWithUsd(
      estimatedRefundTokenAmount,
      estimatedRefundUsd,
      executionFee?.feeToken.symbol,
      executionFee?.feeToken.decimals,
      {
        displayPlus: true,
      }
    );

    return { executionFeeText, estimatedRefundText };
  }, [executionFee, executionFeeBufferBps, tokenData]);

  const value: ReactNode = useMemo(() => {
    if (!executionFee?.feeUsd) {
      return "-";
    }

    return (
      <TooltipWithPortal
        portalClassName="NetworkFeeRow-tooltip"
        position="top-end"
        renderContent={() => (
          <>
            <StatsTooltipRow label={t`Max Execution Fee`} showDollar={false} value={executionFeeText} />
            <p>
              <Trans>
                The max execution fee is overestimated, including by the buffer set under settings. Upon execution, any
                excess execution fee is sent back to your account.
              </Trans>{" "}
              <ExternalLink className="inline" href="https://docs.gmx.io/docs/trading/v2#execution-fee">
                <Trans>Read more</Trans>
              </ExternalLink>
              .
            </p>
            <StatsTooltipRow
              label={t`Estimated Fee Refund`}
              showDollar={false}
              value={estimatedRefundText}
              className="text-green"
            />
            {executionFee?.warning && <p className="text-yellow">{executionFee?.warning}</p>}
          </>
        )}
      >
        {formatUsd(executionFee?.feeUsd.mul(-1))}
      </TooltipWithPortal>
    );
  }, [estimatedRefundText, executionFee?.feeUsd, executionFee?.warning, executionFeeText]);

  return (
    <ExchangeInfoRow
      label={
        <TooltipWithPortal
          position="top-start"
          renderContent={() => (
            <div>
              <Trans>
                Maximum execution fee paid to the network. This fee is a blockchain cost not specific to GMX, and it
                does not impact your collateral.
              </Trans>
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
