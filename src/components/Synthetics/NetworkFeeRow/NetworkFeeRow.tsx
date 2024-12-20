import { Trans, t } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import type { ExecutionFee } from "domain/synthetics/fees/types";
import { convertToUsd } from "domain/synthetics/tokens/utils";
import { formatTokenAmountWithUsd, formatUsd } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { useRawGasPrice } from "domain/synthetics/fees/useRawGasPrice";
import { useChainId } from "lib/chains";
import "./NetworkFeeRow.scss";

type Props = {
  executionFee?: ExecutionFee;
  isAdditionOrdersMsg?: boolean;
};

export function NetworkFeeRow({ executionFee, isAdditionOrdersMsg }: Props) {
  const { chainId } = useChainId();
  const rawGasPrice = useRawGasPrice(chainId);
  const tokenData = useTokensData();

  let displayDecimals = executionFee?.feeToken.priceDecimals;
  if (displayDecimals !== undefined) {
    displayDecimals += 1;
  } else {
    displayDecimals = 5;
  }

  const executionFeeText = formatTokenAmountWithUsd(
    executionFee?.feeTokenAmount === undefined ? undefined : -executionFee.feeTokenAmount,
    executionFee?.feeUsd === undefined ? undefined : -executionFee.feeUsd,
    executionFee?.feeToken.symbol,
    executionFee?.feeToken.decimals,
    {
      displayDecimals,
    }
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
    if (rawGasPrice === undefined || !executionFee) {
      estimatedRefundTokenAmount = undefined;
    } else {
      const keeperExecutionFeeAmount = BigInt(rawGasPrice) * BigInt(executionFee.gasLimit);
      estimatedRefundTokenAmount = executionFee.feeTokenAmount - keeperExecutionFeeAmount;
    }

    let estimatedRefundUsd: bigint | undefined;

    if (!executionFee || !tokenData) {
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
        displayDecimals,
      }
    );

    return estimatedRefundText;
  }, [displayDecimals, executionFee, rawGasPrice, tokenData]);

  const value: ReactNode = useMemo(() => {
    if (executionFee?.feeUsd === undefined) {
      return "-";
    }

    return (
      <TooltipWithPortal
        tooltipClassName="NetworkFeeRow-tooltip"
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
