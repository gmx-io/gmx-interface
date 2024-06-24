import { Trans, t } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
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
import { bigMath } from "lib/bigmath";

type Props = {
  executionFee?: ExecutionFee;
  isAdditionOrdersMsg?: boolean;
};

/**
 * This is not an accurate refund ration, just an estimation based on the recent data.
 * 10%
 */
const ESTIMATED_REFUND_BPS = 10 * 100;

export function NetworkFeeRow({ executionFee, isAdditionOrdersMsg }: Props) {
  const executionFeeBufferBps = useExecutionFeeBufferBps();
  const tokenData = useTokensData();

  const executionFeeText = formatTokenAmountWithUsd(
    executionFee?.feeTokenAmount === undefined ? undefined : -executionFee.feeTokenAmount,
    executionFee?.feeUsd === undefined ? undefined : -executionFee.feeUsd,
    executionFee?.feeToken.symbol,
    executionFee?.feeToken.decimals
  );

  const additionalOrdersMsg = useMemo(
    () =>
      isAdditionOrdersMsg && (
        <Trans>
          Max Network Fee includes fees for additional orders. It will be sent back in full to your account if they
          don't trigger and are cancelled.{" "}
          <ExternalLink href="https://docs.gmx.io/docs/trading/v2#execution-fee">Read more</ExternalLink>.
        </Trans>
      ),
    [isAdditionOrdersMsg]
  );

  const estimatedRefundText = useMemo(() => {
    let estimatedRefundTokenAmount: bigint | undefined;
    if (!executionFee || executionFeeBufferBps === undefined) {
      estimatedRefundTokenAmount = undefined;
    } else {
      const fee = executionFee.feeTokenAmount;
      const feeBeforeBuffer = bigMath.mulDiv(
        fee,
        BASIS_POINTS_DIVISOR_BIGINT,
        BigInt(BASIS_POINTS_DIVISOR + executionFeeBufferBps)
      );
      estimatedRefundTokenAmount =
        bigMath.mulDiv(feeBeforeBuffer, BigInt(ESTIMATED_REFUND_BPS), BASIS_POINTS_DIVISOR_BIGINT) +
        (fee - feeBeforeBuffer);
    }

    let estimatedRefundUsd: bigint | undefined;

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

    return estimatedRefundText;
  }, [executionFee, executionFeeBufferBps, tokenData]);

  const value: ReactNode = useMemo(() => {
    if (executionFee?.feeUsd === undefined) {
      return "-";
    }

    return (
      <TooltipWithPortal
        portalClassName="NetworkFeeRow-tooltip"
        position="top-end"
        renderContent={() => (
          <>
            <StatsTooltipRow label={t`Max Network Fee`} showDollar={false} value={executionFeeText} />
            <div className="h-8" />
            <p>
              <Trans>
                The max network fee is overestimated, including by the buffer set under settings. Upon execution, any
                excess network fee is sent back to your account.
              </Trans>{" "}
              <ExternalLink className="inline" href="https://docs.gmx.io/docs/trading/v2#execution-fee">
                <Trans>Read more</Trans>
              </ExternalLink>
              .
            </p>
            <br />
            <StatsTooltipRow
              label={t`Estimated Fee Refund`}
              showDollar={false}
              value={estimatedRefundText}
              textClassName="text-green-500"
            />
            {executionFee?.warning && <p className="text-yellow-500">{executionFee?.warning}</p>}
            {additionalOrdersMsg && <p>{additionalOrdersMsg}</p>}
          </>
        )}
      >
        {formatUsd(executionFee?.feeUsd ? executionFee.feeUsd * -1n : undefined)}
      </TooltipWithPortal>
    );
  }, [estimatedRefundText, executionFee?.feeUsd, executionFee?.warning, executionFeeText, additionalOrdersMsg]);

  return (
    <ExchangeInfoRow
      label={
        <TooltipWithPortal
          position="top-start"
          renderContent={() => (
            <div>
              <Trans>
                Maximum network fee paid to the network. This fee is a blockchain cost not specific to GMX, and it does
                not impact your collateral.
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
