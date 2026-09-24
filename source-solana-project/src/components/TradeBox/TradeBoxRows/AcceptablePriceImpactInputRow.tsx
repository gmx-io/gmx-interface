import './AcceptablePriceImpactInputRow.scss';

import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import PercentageInput from '@/components/Common/Input/PercentageInput';
import { BN_ZERO } from '@/config/constants';
import { HIGH_POSITION_IMPACT_BPS } from '@/config/factors';
import { formatPercentage } from '@/utils/legacy/format';
import { t, Trans } from '@lingui/macro';
import { memo, useCallback, useMemo } from 'react';

type Props = {
  acceptablePriceImpactBps?: number;
  recommendedAcceptablePriceImpactBps?: number;
  initialPriceImpactFeeBps?: number;
  priceImpactFeeBps?: number;
  setAcceptablePriceImpactBps: (value: number) => void;
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
      setAcceptablePriceImpactBps(value ?? 0);
    },
    [setAcceptablePriceImpactBps]
  );

  const recommendedValue =
    recommendedAcceptablePriceImpactBps !== undefined
      ? recommendedAcceptablePriceImpactBps
      : undefined;
  const initialValue =
    initialPriceImpactFeeBps !== undefined
      ? initialPriceImpactFeeBps
      : undefined;
  const value =
    acceptablePriceImpactBps !== undefined
      ? acceptablePriceImpactBps
      : undefined;

  // if current price impact is 0.01%, the message will be shown
  // only if acceptable price impact is set to more than 0.51%
  const highValue = useMemo(() => {
    if (priceImpactFeeBps === undefined) {
      return undefined;
    }

    if (priceImpactFeeBps > BN_ZERO.toNumber()) {
      return HIGH_POSITION_IMPACT_BPS + priceImpactFeeBps;
    } else {
      return HIGH_POSITION_IMPACT_BPS;
    }
  }, [priceImpactFeeBps]);

  const handleRecommendedValueClick = useCallback(() => {
    setValue(recommendedValue);
  }, [recommendedValue, setValue]);

  if (
    notAvailable ||
    recommendedValue === undefined ||
    initialValue === undefined ||
    priceImpactFeeBps === undefined
  ) {
    return (
      <ExchangeInfoRow label={t`Acceptable Price Impact`}>
        <span className="AcceptablePriceImpactInputRow-na">{t`N/A`}</span>
      </ExchangeInfoRow>
    );
  }

  const recommendedHandle = (
    <Trans>
      <span
        className="AcceptablePriceImpactInputRow-handle"
        onClick={handleRecommendedValueClick}
      >
        Set Recommended Impact:{' '}
        {formatPercentage(recommendedValue * -1, 2, {
          fallbackToZero: true,
          signed: true,
        })}
      </span>
      .
    </Trans>
  );

  const lowValueWarningText =
    priceImpactFeeBps > 0 ? (
      <p>
        <Trans>
          The current Price Impact is{' '}
          {formatPercentage(priceImpactFeeBps, 2, {
            fallbackToZero: true,
            signed: true,
          })}
          . Consider using -0.30% Acceptable Price Impact so the order is more
          likely to be processed.
        </Trans>
        <br />
        <br />
        {recommendedHandle}
      </p>
    ) : (
      <p>
        <Trans>
          The Current Price Impact is{' '}
          {formatPercentage(priceImpactFeeBps, 2, {
            fallbackToZero: true,
            signed: true,
          })}
          . Consider adding a buffer of 0.30% to it so the order is more likely
          to be processed.
        </Trans>
        <br />
        <br />
        {recommendedHandle}
      </p>
    );

  const highValueWarningText = (
    <p>
      <Trans>
        You have set a high Acceptable Price Impact. The current Price Impact is{' '}
        {formatPercentage(priceImpactFeeBps, 2, {
          fallbackToZero: true,
          signed: true,
        })}
        .
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

export const AcceptablePriceImpactInputRow = memo(
  AcceptablePriceImpactInputRowImpl
) as typeof AcceptablePriceImpactInputRowImpl;
