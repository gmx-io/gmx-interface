import { Trans, t } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { BASIS_POINTS_DIVISOR, BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useExecutionFeeBufferBps } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GasPaymentParams } from "domain/synthetics/express";
import { getExecutionFeeWarning, type ExecutionFee } from "domain/synthetics/fees";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { TokenData } from "domain/tokens";
import { formatTokenAmountWithUsd, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { bigMath } from "sdk/utils/bigmath";

import ExchangeInfoRow from "components/ExchangeInfoRow/ExchangeInfoRow";
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
          Max network fee includes fees for additional orders. Refunded in full if they don't trigger and are canceled.{" "}
          <ExternalLink href="https://docs.gmx.io/docs/trading/fees/#network-fee">Read more</ExternalLink>.
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
      executionDisplayDecimals = 2;
    } else {
      executionDisplayDecimals = 5;
    }
  }

  let networkFeeDisplayDecimals = networkFee?.feeToken.priceDecimals;
  if (networkFeeDisplayDecimals !== undefined) {
    networkFeeDisplayDecimals += 1;
  } else {
    if (networkFee?.feeToken.isStable) {
      networkFeeDisplayDecimals = 2;
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
        handleClassName="numbers"
        content={
          <>
            <StatsTooltipRow
              label={t`Max network fee`}
              showDollar={false}
              value={maxNetworkFeeText}
              valueClassName="numbers"
            />
            <div className="h-8" />
            <p>
              <Trans>
                Max network fee includes a buffer for gas spikes. Unused fees refunded on execution.{" "}
                <ExternalLink className="inline" href="https://docs.gmx.io/docs/trading/fees/#network-fee">
                  Read more
                </ExternalLink>
                .
              </Trans>
            </p>
            <br />
            <StatsTooltipRow
              label={t`Estimated fee refund`}
              showDollar={false}
              value={estimatedRefundText}
              valueClassName="numbers"
              textClassName="text-green-500"
            />
            {warning && <p className="text-yellow-300">{warning}</p>}
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
            variant="iconStroke"
            content={<Trans>Blockchain gas fee (not GMX-specific). Doesn't impact your collateral.</Trans>}
          >
            <Trans>Network fee</Trans>
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
          variant="iconStroke"
          content={<Trans>Blockchain gas fee (not GMX-specific). Doesn't impact your collateral.</Trans>}
        >
          <Trans>Network fee</Trans>
        </TooltipWithPortal>
      }
      value={value}
    />
  );
}
