import { Trans, t } from "@lingui/macro";
import { memo, useCallback, useMemo } from "react";

import { HIGH_ACCEPTABLE_POSITION_IMPACT_BPS } from "config/factors";
import { formatPercentage } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";

import PercentageInput from "components/PercentageInput/PercentageInput";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";

import "./AcceptablePriceImpactInputRow.scss";

type Props = {
  acceptablePriceImpactBps?: bigint;
  recommendedAcceptablePriceImpactBps?: bigint;
  initialPriceImpactFeeBps?: bigint;
  priceImpactFeeBps?: bigint;
  setAcceptablePriceImpactBps: (value: bigint) => void;
  notAvailable?: boolean;
  className?: string;
};

const EMPTY_SUGGESTIONS: number[] = [];

function AcceptablePriceImpactInputRowImpl({
  acceptablePriceImpactBps,
  recommendedAcceptablePriceImpactBps = acceptablePriceImpactBps,
  initialPriceImpactFeeBps = acceptablePriceImpactBps,
  priceImpactFeeBps,
  setAcceptablePriceImpactBps,
  notAvailable = false,
  className,
}: Props) {
  const setValue = useCallback(
    (value: number | undefined) => {
      setAcceptablePriceImpactBps(BigInt(value ?? 0));
    },
    [setAcceptablePriceImpactBps]
  );

  const recommendedValue =
    recommendedAcceptablePriceImpactBps !== undefined ? Number(recommendedAcceptablePriceImpactBps) : undefined;
  const initialValue = initialPriceImpactFeeBps !== undefined ? Number(initialPriceImpactFeeBps) : undefined;
  const value = acceptablePriceImpactBps !== undefined ? Number(acceptablePriceImpactBps) : undefined;

  // if current price impact is 0.01%, the message will be shown
  // only if acceptable price impact is set to more than 0.51%
  const highValue = useMemo(() => {
    if (priceImpactFeeBps === undefined) {
      return undefined;
    }

    if (priceImpactFeeBps <= 0) {
      return HIGH_ACCEPTABLE_POSITION_IMPACT_BPS + Number(bigMath.abs(priceImpactFeeBps));
    } else {
      return HIGH_ACCEPTABLE_POSITION_IMPACT_BPS;
    }
  }, [priceImpactFeeBps]);

  const handleRecommendedValueClick = useCallback(() => {
    setValue(recommendedValue);
  }, [recommendedValue, setValue]);

  if (notAvailable || recommendedValue === undefined || initialValue === undefined || priceImpactFeeBps === undefined) {
    return (
      <SyntheticsInfoRow label={t`Acceptable Price Impact`}>
        <Trans>NA</Trans>
      </SyntheticsInfoRow>
    );
  }

  const recommendedHandle = (
    <Trans>
      <span className="AcceptablePriceImpactInputRow-handle" onClick={handleRecommendedValueClick}>
        Set Recommended Impact: {formatPercentage(BigInt(recommendedValue) * -1n, { signed: true })}
      </span>
      .
    </Trans>
  );

  const lowValueWarningText =
    priceImpactFeeBps >= 0 ? (
      <p>
        <Trans>
          The current price impact is {formatPercentage(priceImpactFeeBps, { signed: true })}. Consider using -0.30%
          acceptable price impact so the order is more likely to be processed.
        </Trans>
        <br />
        <br />
        {recommendedHandle}
      </p>
    ) : (
      <p>
        <Trans>
          The current price impact is {formatPercentage(priceImpactFeeBps, { signed: true })}. Consider adding a buffer
          of 0.30% to it so the order is more likely to be processed.
        </Trans>
        <br />
        <br />
        {recommendedHandle}
      </p>
    );

  const highValueWarningText = (
    <p>
      <Trans>
        You have set a high acceptable price impact. The current price impact is{" "}
        {formatPercentage(priceImpactFeeBps, { signed: true })}.
      </Trans>
      <br />
      <br />
      {recommendedHandle}
    </p>
  );

  return (
    <SyntheticsInfoRow className={className} label={t`Acceptable Price Impact`} valueClassName="-my-5">
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

export const AcceptablePriceImpactInputRow = memo(
  AcceptablePriceImpactInputRowImpl
) as typeof AcceptablePriceImpactInputRowImpl;
