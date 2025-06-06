import { Trans, t } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useExecutionFeeBufferBps } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GasPaymentParams } from "domain/synthetics/express";
import { getExecutionFeeWarning, type ExecutionFee } from "domain/synthetics/fees";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens/utils";
import { TokenData } from "domain/tokens";
import { formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { bigMath } from "sdk/utils/bigmath";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";

type Props = {
  executionFee?: ExecutionFee;
  gasPaymentParams?: GasPaymentParams;
  isAdditionOrdersMsg?: boolean;
  rowPadding?: boolean;
};

/**
 * This is not an accurate refund ration, just an estimation based on the recent data.
 * 10%
 */
const ESTIMATED_REFUND_BPS = 10 * 100;

export function NetworkFeeRow({ executionFee, gasPaymentParams, isAdditionOrdersMsg, rowPadding = false }: Props) {
  const executionFeeBufferBps = useExecutionFeeBufferBps();
  const tokensData = useTokensData();
  const chainId = useSelector(selectChainId);
  const gasPaymentToken = getByKey(tokensData, gasPaymentParams?.gasPaymentTokenAddress);
  const executionFeeToken = getByKey(tokensData, executionFee?.feeToken.address);

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
    let feeToken: TokenData;

    if (gasPaymentToken && gasPaymentParams?.gasPaymentTokenAmount !== undefined) {
      feeToken = gasPaymentToken;
      feeAmount = gasPaymentParams.gasPaymentTokenAmount;
      feeUsd = convertToUsd(
        gasPaymentParams.gasPaymentTokenAmount,
        gasPaymentToken.decimals,
        gasPaymentToken.prices.minPrice
      )!;
    } else if (executionFee && executionFeeToken) {
      feeUsd = executionFee.feeUsd;
      feeAmount = executionFee.feeTokenAmount;
      feeToken = executionFeeToken;
    } else {
      return undefined;
    }

    return {
      feeUsd,
      feeAmount,
      feeToken,
    };
  }, [executionFee, executionFeeToken, gasPaymentToken, gasPaymentParams]);

  let executionDisplayDecimals = executionFee?.feeToken.priceDecimals;
  if (executionDisplayDecimals !== undefined) {
    executionDisplayDecimals += 1;
  } else {
    if (executionFeeToken?.isStable) {
      executionDisplayDecimals = 3;
    } else {
      executionDisplayDecimals = 5;
    }
  }

  let networkFeeDisplayDecimals = networkFee?.feeToken.priceDecimals;
  if (networkFeeDisplayDecimals !== undefined) {
    networkFeeDisplayDecimals += 1;
  } else {
    if (networkFee?.feeToken.isStable) {
      networkFeeDisplayDecimals = 3;
    } else {
      networkFeeDisplayDecimals = 5;
    }
  }

  const { estimatedRefundText, estimatedRefundUsd } = useMemo(() => {
    let estimatedRefundUsd: bigint | undefined;

    if (!networkFee || executionFeeBufferBps === undefined) {
      estimatedRefundUsd = undefined;
    } else {
      const feeUsBeforeBuffer = bigMath.mulDiv(
        networkFee.feeUsd,
        BASIS_POINTS_DIVISOR_BIGINT,
        BigInt(BASIS_POINTS_DIVISOR + executionFeeBufferBps)
      );

      estimatedRefundUsd =
        bigMath.mulDiv(feeUsBeforeBuffer, BigInt(ESTIMATED_REFUND_BPS), BASIS_POINTS_DIVISOR_BIGINT) +
        (networkFee.feeUsd - feeUsBeforeBuffer);
    }

    const estimatedRefundTokenAmount = convertToTokenAmount(
      estimatedRefundUsd,
      executionFeeToken?.decimals,
      executionFeeToken?.prices.minPrice
    );

    const estimatedRefundText = formatTokenAmountWithUsd(
      estimatedRefundTokenAmount,
      estimatedRefundUsd,
      executionFeeToken?.symbol,
      executionFeeToken?.decimals,
      {
        displayPlus: true,
        displayDecimals: executionDisplayDecimals,
        isStable: executionFeeToken?.isStable,
      }
    );

    return {
      estimatedRefundText,
      estimatedRefundUsd,
    };
  }, [
    executionDisplayDecimals,
    executionFeeBufferBps,
    executionFeeToken?.decimals,
    executionFeeToken?.isStable,
    executionFeeToken?.prices.minPrice,
    executionFeeToken?.symbol,
    networkFee,
  ]);

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
        displayDecimals: networkFeeDisplayDecimals,
        isStable: networkFee.feeToken.isStable,
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
    networkFeeDisplayDecimals,
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
