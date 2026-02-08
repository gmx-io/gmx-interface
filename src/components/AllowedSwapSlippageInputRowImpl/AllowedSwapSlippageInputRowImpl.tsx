import { Trans, t } from "@lingui/macro";
import { memo, useCallback, useMemo } from "react";

import { HIGH_ALLOWED_SWAP_SLIPPAGE_BPS } from "config/factors";
import { formatPercentage } from "lib/numbers";

import PercentageInput from "components/PercentageInput/PercentageInput";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";

import "../AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow.scss";

type Props = {
  allowedSwapSlippageBps?: bigint;
  recommendedAllowedSwapSlippageBps?: bigint;
  initialSwapImpactFeeBps?: bigint;
  setAllowedSwapSlippageBps: (value: bigint) => void;
  totalSwapImpactBps: bigint;
  notAvailable?: boolean;
};

const EMPTY_SUGGESTIONS: number[] = [];

function AllowedSwapSlippageInputRowImpl({
  allowedSwapSlippageBps,
  recommendedAllowedSwapSlippageBps = allowedSwapSlippageBps,
  initialSwapImpactFeeBps = allowedSwapSlippageBps,
  setAllowedSwapSlippageBps,
  notAvailable = false,
  totalSwapImpactBps,
}: Props) {
  const setValue = useCallback(
    (value: number | undefined) => {
      setAllowedSwapSlippageBps(BigInt(value ?? 0));
    },
    [setAllowedSwapSlippageBps]
  );

  const recommendedValue =
    recommendedAllowedSwapSlippageBps !== undefined ? Number(recommendedAllowedSwapSlippageBps) : undefined;
  const initialValue = initialSwapImpactFeeBps !== undefined ? Number(initialSwapImpactFeeBps) : undefined;
  const value = allowedSwapSlippageBps !== undefined ? Number(allowedSwapSlippageBps) : undefined;

  const highValue = useMemo(() => {
    if (recommendedValue === undefined) {
      return undefined;
    }

    return HIGH_ALLOWED_SWAP_SLIPPAGE_BPS + recommendedValue;
  }, [recommendedValue]);

  const handleRecommendedValueClick = useCallback(() => {
    setValue(recommendedValue);
  }, [recommendedValue, setValue]);

  if (notAvailable || recommendedValue === undefined || initialValue === undefined) {
    return (
      <SyntheticsInfoRow label={t`Allowed slippage`}>
        <span className="AllowedSwapSlippageInputRow-na">{t`N/A`}</span>
      </SyntheticsInfoRow>
    );
  }

  const recommendedHandle = (
    <Trans>
      <span className="AllowedSwapSlippageInputRow-handle" onClick={handleRecommendedValueClick}>
        Set recommended impact: {formatPercentage(BigInt(recommendedValue) * -1n, { signed: true })}
      </span>
      .
    </Trans>
  );

  const lowValueWarningText = (
    <p>
      <Trans>
        Current swap impact: {formatPercentage(totalSwapImpactBps, { signed: true })}. Add 1% buffer for better
        execution.
      </Trans>
      <br />
      <br />
      {recommendedHandle}
    </p>
  );

  const highValueWarningText = (
    <p>
      <Trans>High slippage set. Current swap impact: {formatPercentage(totalSwapImpactBps, { signed: true })}.</Trans>
      <br />
      <br />
      {recommendedHandle}
    </p>
  );

  return (
    <SyntheticsInfoRow label={t`Allowed slippage`} valueClassName="-my-5">
      <PercentageInput
        onChange={setValue}
        defaultValue={initialValue}
        value={value}
        highValue={highValue}
        highValueCheckStrategy="gt"
        lowValue={recommendedValue}
        suggestions={EMPTY_SUGGESTIONS}
        highValueWarningText={highValueWarningText}
        lowValueWarningText={lowValueWarningText}
        negativeSign
        tooltipPosition="bottom-end"
      />
    </SyntheticsInfoRow>
  );
}

export const AllowedSwapSlippageInputRow = memo(
  AllowedSwapSlippageInputRowImpl
) as typeof AllowedSwapSlippageInputRowImpl;
