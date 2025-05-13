import { Trans, t } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useExecutionFeeBufferBps } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { RelayerFeeParams } from "domain/synthetics/express";
import { getExecutionFeeWarning, type ExecutionFee } from "domain/synthetics/fees";
import { convertToUsd } from "domain/synthetics/tokens/utils";
import { Token } from "domain/tokens";
import { formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { convertTokenAddress } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";

type Props = {
  executionFee?: ExecutionFee;
  relayerFeeParams?: RelayerFeeParams;
  isAdditionOrdersMsg?: boolean;
  rowPadding?: boolean;
};

/**
 * This is not an accurate refund ration, just an estimation based on the recent data.
 * 10%
 */
const ESTIMATED_REFUND_BPS = 10 * 100;

export function NetworkFeeRow({ executionFee, relayerFeeParams, isAdditionOrdersMsg, rowPadding = false }: Props) {
  const executionFeeBufferBps = useExecutionFeeBufferBps();
  const tokenData = useTokensData();
  const chainId = useSelector(selectChainId);
  const gasPaymentToken = getByKey(tokenData, relayerFeeParams?.gasPaymentTokenAddress);

  let displayDecimals = executionFee?.feeToken.priceDecimals;
  if (displayDecimals !== undefined) {
    displayDecimals += 1;
  } else {
    displayDecimals = 5;
  }

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

  const networkFee = useMemo(() => {
    let feeUsd: bigint;
    let feeAmount: bigint;
    let feeToken: Token;

    if (gasPaymentToken && relayerFeeParams?.gasPaymentTokenAmount !== undefined) {
      feeToken = gasPaymentToken;
      feeAmount = relayerFeeParams.gasPaymentTokenAmount;
      feeUsd = convertToUsd(
        relayerFeeParams.gasPaymentTokenAmount,
        gasPaymentToken.decimals,
        gasPaymentToken.prices.minPrice
      )!;
    } else if (executionFee) {
      feeUsd = executionFee.feeUsd;
      feeAmount = executionFee.feeTokenAmount;
      feeToken = executionFee.feeToken;
    } else {
      return undefined;
    }

    return {
      feeUsd,
      feeAmount,
      feeToken,
    };
  }, [executionFee, gasPaymentToken, relayerFeeParams]);

  const { estimatedRefundText, estimatedRefundUsd } = useMemo(() => {
    let estimatedRefundTokenAmount: bigint | undefined;
    let feeToken = executionFee?.feeToken.address
      ? getByKey(tokenData, convertTokenAddress(chainId, executionFee.feeToken.address, "wrapped"))
      : undefined;

    if (!networkFee || executionFeeBufferBps === undefined) {
      estimatedRefundTokenAmount = undefined;
    } else {
      const feeBeforeBuffer = bigMath.mulDiv(
        networkFee.feeAmount,
        BASIS_POINTS_DIVISOR_BIGINT,
        BigInt(BASIS_POINTS_DIVISOR + executionFeeBufferBps)
      );
      estimatedRefundTokenAmount =
        bigMath.mulDiv(feeBeforeBuffer, BigInt(ESTIMATED_REFUND_BPS), BASIS_POINTS_DIVISOR_BIGINT) +
        (networkFee.feeAmount - feeBeforeBuffer);
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
      feeToken?.symbol,
      feeToken?.decimals,
      {
        displayPlus: true,
        displayDecimals,
      }
    );

    return {
      estimatedRefundText,
      estimatedRefundUsd,
    };
  }, [chainId, displayDecimals, executionFee, executionFeeBufferBps, networkFee, tokenData]);

  const value: ReactNode = useMemo(() => {
    if (networkFee === undefined) {
      return "-";
    }

    const maxNetworkFeeText = formatTokenAmountWithUsd(
      -networkFee.feeAmount,
      networkFee.feeUsd,
      networkFee.feeToken.symbol,
      networkFee.feeToken.decimals,
      {
        displayDecimals,
      }
    );

    const feeUsdAfterRefund = networkFee.feeUsd - (estimatedRefundUsd ?? 0n);

    const warning = executionFee ? getExecutionFeeWarning(chainId, executionFee) : undefined;

    return (
      <TooltipWithPortal
        tooltipClassName="NetworkFeeRow-tooltip"
        position="left-start"
        content={
          <>
            <StatsTooltipRow label={t`Max Network Fee`} showDollar={false} value={maxNetworkFeeText} />
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
        {formatUsd(-feeUsdAfterRefund)}
      </TooltipWithPortal>
    );
  }, [
    networkFee,
    displayDecimals,
    estimatedRefundUsd,
    executionFee,
    chainId,
    estimatedRefundText,
    additionalOrdersMsg,
  ]);

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
