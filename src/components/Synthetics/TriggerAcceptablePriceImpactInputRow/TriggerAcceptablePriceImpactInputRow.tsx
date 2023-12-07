import { t } from "@lingui/macro";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import PercentageInput from "components/PercentageInput/PercentageInput";
import { TradeFees } from "domain/synthetics/trade";
import { BigNumber } from "ethers";
import { formatPercentage } from "lib/numbers";
import { memo, useCallback } from "react";

type Props = {
  defaultAcceptablePriceImpactBps: BigNumber | undefined;
  fees: TradeFees | undefined;
  setSelectedAcceptablePriceImpactBps: (value: BigNumber) => void;
  notAvailable?: boolean;
};

function TriggerAcceptablePriceImpactInputRowImpl({
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

  if (!defaultAcceptablePriceImpactBps || !fees || defaultValue === undefined) {
    return null;
  }

  const lowValueWarningText = fees.positionPriceImpact?.bps.gte(0)
    ? t`Recommended Acceptable Price Impact is 0.3% so the order is more likely to be processed.`
    : t`The Current Price Impact is ${formatPercentage(
        fees.positionPriceImpact?.bps
      )}. Consider adding a buffer of 0.3% to it so the order is more likely to be processed.`;

  const content = notAvailable ? (
    t`NA`
  ) : (
    <PercentageInput
      onChange={setValue}
      defaultValue={defaultValue}
      highValue={defaultValue + 1}
      lowValue={defaultValue}
      highValueWarningText={t`You have set a high Acceptable Price Impact. Please verify Acceptable Price of the order.`}
      lowValueWarningText={lowValueWarningText}
    />
  );

  return <ExchangeInfoRow label={t`Acceptable Price Impact`}>{content}</ExchangeInfoRow>;
}

export const TriggerAcceptablePriceImpactInputRow = memo(
  TriggerAcceptablePriceImpactInputRowImpl
) as typeof TriggerAcceptablePriceImpactInputRowImpl;
