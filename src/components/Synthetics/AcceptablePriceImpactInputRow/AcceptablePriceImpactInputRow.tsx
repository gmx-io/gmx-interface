import { Trans, t } from "@lingui/macro";
import { BigNumber } from "ethers";
import { memo, useCallback, useMemo } from "react";

import { HIGH_POSITION_IMPACT_BPS } from "config/factors";
import { formatPercentage } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import PercentageInput from "components/PercentageInput/PercentageInput";

import "./AcceptablePriceImpactInputRow.scss";

type Props = {
  acceptablePriceImpactBps?: BigNumber;
  recommendedAcceptablePriceImpactBps?: BigNumber;
  initialPriceImpactFeeBps?: BigNumber;
  priceImpactFeeBps?: BigNumber;
  setAcceptablePriceImpactBps: (value: BigNumber) => void;
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
      setAcceptablePriceImpactBps(BigInt(value));
    },
    [setAcceptablePriceImpactBps]
  );

  const recommendedValue = recommendedAcceptablePriceImpactBps?.toNumber();
  const initialValue = initialPriceImpactFeeBps?.toNumber();
  const value = acceptablePriceImpactBps?.toNumber();

  // if current price impact is 0.01%, the message will be shown
  // only if acceptable price impact is set to more than 0.51%
  const highValue = useMemo(() => {
    if (!priceImpactFeeBps) {
      return undefined;
    }

    if (priceImpactFeeBps.lte(0)) {
      return HIGH_POSITION_IMPACT_BPS + priceImpactFeeBps.abs().toNumber();
    } else {
      return HIGH_POSITION_IMPACT_BPS;
    }
  }, [priceImpactFeeBps]);

  const handleRecommendedValueClick = useCallback(() => {
    setValue(recommendedValue);
  }, [recommendedValue, setValue]);

  if (recommendedValue === undefined || initialValue === undefined || !priceImpactFeeBps) {
    return null;
  }

  const recommendedHandle = (
    <Trans>
      <span className="AcceptablePriceImpactInputRow-handle" onClick={handleRecommendedValueClick}>
        Set Recommended Impact: {formatPercentage(BigInt(recommendedValue).mul(-1), { signed: true })}
      </span>
      .
    </Trans>
  );

  const lowValueWarningText = priceImpactFeeBps.gte(0) ? (
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
        The Current Price Impact is {formatPercentage(priceImpactFeeBps, { signed: true })}. Consider adding a buffer of
        0.30% to it so the order is more likely to be processed.
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
