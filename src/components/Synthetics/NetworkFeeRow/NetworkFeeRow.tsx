import { Trans, t } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useExecutionFeeBufferBps } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { getExecutionFeeWarning, type ExecutionFee } from "domain/synthetics/fees";
import { convertToUsd } from "domain/synthetics/tokens/utils";
import { formatTokenAmountWithUsd, formatUsd } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";

import { bigMath } from "sdk/utils/bigmath";

type Props = {
  executionFee?: ExecutionFee;
  isAdditionOrdersMsg?: boolean;
  rowPadding?: boolean;
};

/**
 * This is not an accurate refund ration, just an estimation based on the recent data.
 * 10%
 */
const ESTIMATED_REFUND_BPS = 10 * 100;

export function NetworkFeeRow({ executionFee, isAdditionOrdersMsg, rowPadding = false }: Props) {
  const executionFeeBufferBps = useExecutionFeeBufferBps();
  const tokenData = useTokensData();
  const chainId = useSelector(selectChainId);

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

  const estimatedRefund = useMemo(() => {
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

    return {
      estimatedRefundTokenAmount,
      estimatedRefundUsd,
    };
  }, [executionFee, executionFeeBufferBps, tokenData]);

  const estimatedRefundText = useMemo(() => {
    const { estimatedRefundTokenAmount, estimatedRefundUsd } = estimatedRefund;
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
  }, [displayDecimals, executionFee, estimatedRefund]);

  const executionFeeWithRefundUsd = useMemo(() => {
    if (!executionFee || typeof estimatedRefund.estimatedRefundUsd === "undefined") {
      return undefined;
    }

    const feeWithRefundUsd = executionFee.feeUsd - estimatedRefund.estimatedRefundUsd;

    return feeWithRefundUsd;
  }, [executionFee, estimatedRefund.estimatedRefundUsd]);

  const value: ReactNode = useMemo(() => {
    if (executionFee?.feeUsd === undefined) {
      return "-";
    }

    const warning = getExecutionFeeWarning(chainId, executionFee);

    return (
      <TooltipWithPortal
        tooltipClassName="NetworkFeeRow-tooltip"
        position="left-start"
        content={
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
            {warning && <p className="text-yellow-500">{warning}</p>}
            {additionalOrdersMsg && <p>{additionalOrdersMsg}</p>}
          </>
        }
      >
        {formatUsd(typeof executionFeeWithRefundUsd !== "undefined" ? executionFeeWithRefundUsd * -1n : undefined)}
      </TooltipWithPortal>
    );
  }, [executionFee, chainId, executionFeeText, estimatedRefundText, additionalOrdersMsg, executionFeeWithRefundUsd]);

  if (rowPadding) {
    return (
      <ExchangeInfoRow
        label={
          <TooltipWithPortal
            position="left-start"
            content={
              <Trans>
                Maximum network fee paid to the network. This fee is a blockchain cost not specific to GMX, and it does
                not impact your collateral.
              </Trans>
            }
          >
            <Trans>Network Fee</Trans>
          </TooltipWithPortal>
        }
        value={value}
      />
    );
  }

  return (
    <SyntheticsInfoRow
      label={
        <TooltipWithPortal
          position="left-start"
          content={
            <Trans>
              Maximum network fee paid to the network. This fee is a blockchain cost not specific to GMX, and it does
              not impact your collateral.
            </Trans>
          }
        >
          <Trans>Network Fee</Trans>
        </TooltipWithPortal>
      }
      value={value}
    />
  );
}
