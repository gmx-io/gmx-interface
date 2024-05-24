import { Trans, t } from "@lingui/macro";
import { memo, useCallback, useMemo } from "react";

import { HIGH_POSITION_IMPACT_BPS } from "config/factors";
import { formatPercentage } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import PercentageInput from "components/PercentageInput/PercentageInput";

import "./AcceptablePriceImpactInputRow.scss";
import { bigMath } from "lib/bigmath";

type Props = {
  acceptablePriceImpactBps?: bigint;
  recommendedAcceptablePriceImpactBps?: bigint;
  initialPriceImpactFeeBps?: bigint;
  priceImpactFeeBps?: bigint;
  setAcceptablePriceImpactBps: (value: bigint) => void;
  notAvailable?: boolean;
};

const EMPTY_SUGGESTIONS: number[] = [];

function AcceptablePriceImpactInputRowImpl({
  acceptablePriceImpactBps,
  recommendedAcceptablePriceImpactBps = acceptablePriceImpactBps,
  initialPriceImpactFeeBps = acceptablePriceImpactBps,
  priceImpactFeeBps,
  setAcceptablePriceImpactBps,
  notAvailable = false,
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
      return HIGH_POSITION_IMPACT_BPS + Number(bigMath.abs(priceImpactFeeBps));
    } else {
      return HIGH_POSITION_IMPACT_BPS;
    }
  }, [priceImpactFeeBps]);

  const handleRecommendedValueClick = useCallback(() => {
    setValue(recommendedValue);
  }, [recommendedValue, setValue]);

  if (recommendedValue === undefined || initialValue === undefined || priceImpactFeeBps === undefined) {
    return null;
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
          The current Price Impact is {formatPercentage(priceImpactFeeBps, { signed: true })}. Consider using -0.30%
          Acceptable Price Impact so the order is more likely to be processed.
        </Trans>
        <br />
        <br />
        {recommendedHandle}
      </p>
    ) : (
      <p>
        <Trans>
          The Current Price Impact is {formatPercentage(priceImpactFeeBps, { signed: true })}. Consider adding a buffer
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
        You have set a high Acceptable Price Impact. The current Price Impact is{" "}
        {formatPercentage(priceImpactFeeBps, { signed: true })}.
      </Trans>
      <br />
      <br />
      {recommendedHandle}
    </p>
  );

  const content = notAvailable ? (
    t`NA`
  ) : (
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
  );

  return <ExchangeInfoRow label={t`Acceptable Price Impact`}>{content}</ExchangeInfoRow>;
}

export const AcceptablePriceImpactInputRow = memo(
  AcceptablePriceImpactInputRowImpl
) as typeof AcceptablePriceImpactInputRowImpl;
