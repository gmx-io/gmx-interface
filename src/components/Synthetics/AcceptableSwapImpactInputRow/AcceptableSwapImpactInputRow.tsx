import { Trans, t } from "@lingui/macro";
import { memo, useCallback, useMemo } from "react";

import { HIGH_ACCEPTABLE_SWAP_IMPACT_BPS } from "config/factors";
import { formatPercentage } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import PercentageInput from "components/PercentageInput/PercentageInput";

import "../AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow.scss";

type Props = {
  acceptableSwapImpactBps?: bigint;
  recommendedAcceptableSwapImpactBps?: bigint;
  initialSwapImpactFeeBps?: bigint;
  setAcceptableSwapImpactBps: (value: bigint) => void;
  notAvailable?: boolean;
  className?: string;
};

const EMPTY_SUGGESTIONS: number[] = [];

function AcceptableSwapImpactInputRowImpl({
  acceptableSwapImpactBps,
  recommendedAcceptableSwapImpactBps = acceptableSwapImpactBps,
  initialSwapImpactFeeBps = acceptableSwapImpactBps,
  setAcceptableSwapImpactBps,
  notAvailable = false,
  className,
}: Props) {
  const setValue = useCallback(
    (value: number | undefined) => {
      setAcceptableSwapImpactBps(BigInt(value ?? 0));
    },
    [setAcceptableSwapImpactBps]
  );

  const recommendedValue =
    recommendedAcceptableSwapImpactBps !== undefined ? Number(recommendedAcceptableSwapImpactBps) : undefined;
  const initialValue = initialSwapImpactFeeBps !== undefined ? Number(initialSwapImpactFeeBps) : undefined;
  const value = acceptableSwapImpactBps !== undefined ? Number(acceptableSwapImpactBps) : undefined;

  const highValue = useMemo(() => {
    if (recommendedValue === undefined) {
      return undefined;
    }

    return HIGH_ACCEPTABLE_SWAP_IMPACT_BPS + recommendedValue;
  }, [recommendedValue]);

  const handleRecommendedValueClick = useCallback(() => {
    setValue(recommendedValue);
  }, [recommendedValue, setValue]);

  if (notAvailable || recommendedValue === undefined || initialValue === undefined) {
    return (
      <ExchangeInfoRow label={t`Acceptable Swap Impact`}>
        <span className="AcceptableSwapImpactInputRow-na">{t`NA`}</span>
      </ExchangeInfoRow>
    );
  }

  const recommendedHandle = (
    <Trans>
      <span className="AcceptableSwapImpactInputRow-handle" onClick={handleRecommendedValueClick}>
        Set recommended impact: {formatPercentage(BigInt(recommendedValue) * -1n, { signed: true })}
      </span>
      .
    </Trans>
  );

  const lowValueWarningText = (
    <p>
      <Trans>
        The current swap impact including fees is {formatPercentage(acceptableSwapImpactBps, { signed: true })}.
        Consider adding a buffer of 1% to it so the order is more likely to be processed
      </Trans>
      <br />
      <br />
      {recommendedHandle}
    </p>
  );

  const highValueWarningText = (
    <p>
      <Trans>
        You have set a high acceptable swap impact. The current swap impact including fees is{" "}
        {formatPercentage(acceptableSwapImpactBps, { signed: true })}.
      </Trans>
      <br />
      <br />
      {recommendedHandle}
    </p>
  );

  return (
    <ExchangeInfoRow className={className} label={t`Acceptable Price Impact`}>
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
    </ExchangeInfoRow>
  );
}

export const AcceptableSwapImpactInputRow = memo(
  AcceptableSwapImpactInputRowImpl
) as typeof AcceptableSwapImpactInputRowImpl;
