import { Trans, t } from "@lingui/macro";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import PercentageInput from "components/PercentageInput/PercentageInput";
import { HIGH_POSITION_IMPACT_BPS } from "config/factors";
import { TradeFees } from "domain/synthetics/trade";
import { BigNumber } from "ethers";
import { formatPercentage } from "lib/numbers";
import { memo, useCallback, useMemo, useState } from "react";
import "./AcceptablePriceImpactInputRow.scss";

type Props = {
  defaultAcceptablePriceImpactBps: BigNumber | undefined;
  fees: TradeFees | undefined;
  setSelectedAcceptablePriceImpactBps: (value: BigNumber) => void;
  notAvailable?: boolean;
};

const EMPTY_SUGGESTIONS: number[] = [];

function AcceptablePriceImpactInputRowImpl({
  defaultAcceptablePriceImpactBps,
  fees,
  setSelectedAcceptablePriceImpactBps,
  notAvailable = false,
}: Props) {
  const setValue = useCallback(
    (value) => {
      setSelectedAcceptablePriceImpactBps(BigNumber.from(value));
    },
    [setSelectedAcceptablePriceImpactBps]
  );

  const defaultValue = defaultAcceptablePriceImpactBps?.toNumber();
  const [key, setKey] = useState(0);

  // https://app.asana.com/0/0/1205148618694228/1206136113111552/f
  const highValue = useMemo(() => {
    if (!fees) {
      return undefined;
    }

    if (fees.positionPriceImpact?.bps.lte(0)) {
      return HIGH_POSITION_IMPACT_BPS + fees.positionPriceImpact?.bps.abs().toNumber();
    } else {
      return HIGH_POSITION_IMPACT_BPS;
    }
  }, [fees]);

  const handleRecommendedValueClick = useCallback(() => {
    setKey((key) => key + 1);
    setValue(defaultValue);
  }, [defaultValue, setValue]);

  if (!defaultAcceptablePriceImpactBps || !fees || defaultValue === undefined) {
    return null;
  }

  const recommendedHandle = (
    <span className="AcceptablePriceImpactInputRow-handle" onClick={handleRecommendedValueClick}>
      <Trans>Recommended Impact: {formatPercentage(BigNumber.from(defaultValue))}.</Trans>
    </span>
  );

  const lowValueWarningText = fees.positionPriceImpact?.bps.gte(0) ? (
    <p>
      <Trans>Recommended Acceptable Price Impact is 0.3% so the order is more likely to be processed.</Trans>
      <br />
      <br />
      {recommendedHandle}
    </p>
  ) : (
    <p>
      <Trans>
        The Current Price Impact is {formatPercentage(fees.positionPriceImpact?.bps.abs())}. Consider adding a buffer of
        0.3% to it so the order is more likely to be processed.
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
        {formatPercentage(fees.positionPriceImpact?.bps.abs())}.
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
      key={key}
      onChange={setValue}
      defaultValue={defaultValue}
      highValue={highValue}
      lowValue={defaultValue}
      suggestions={EMPTY_SUGGESTIONS}
      highValueWarningText={highValueWarningText}
      lowValueWarningText={lowValueWarningText}
    />
  );

  return <ExchangeInfoRow label={t`Acceptable Price Impact`}>{content}</ExchangeInfoRow>;
}

export const AcceptablePriceImpactInputRow = memo(
  AcceptablePriceImpactInputRowImpl
) as typeof AcceptablePriceImpactInputRowImpl;
