import { BN_ZERO } from '@/config/constants';
import { MAX_ALLOWED_LEVERAGE } from '@/config/factors';
import { SidecarOrderEntry } from '@/selectors/sidecar/types';
import { formatLeverage } from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';

export function getEntryErrorForSidecarOrders<T extends SidecarOrderEntry>(
  entry: T,
  type: 'sl' | 'tp' | 'limit',
  {
    liqPrice,
    triggerPrice,
    markPrice,
    isLong,
    isLimit,
    isExistingLimits,
    isExistingPosition,
    maxLimitTrigerPrice,
    minLimitTrigerPrice,
  }: {
    liqPrice?: BN;
    triggerPrice?: BN;
    markPrice?: BN;
    isLong?: boolean;
    isLimit?: boolean;
    isExistingLimits?: boolean;
    isExistingPosition?: boolean;
    maxLimitTrigerPrice?: BN;
    minLimitTrigerPrice?: BN;
  }
): T {
  let sizeError: string | null = null;
  let priceError: string | null = null;
  let percentageError: string | null = null;

  const inputPrice = entry.price.value;

  if (
    inputPrice !== undefined &&
    inputPrice !== null &&
    inputPrice.gt(BN_ZERO)
  ) {
    if (markPrice !== undefined) {
      if (type === 'limit') {
        const nextError = isLong
          ? inputPrice.gt(markPrice) && t`Price above Mark Price.`
          : inputPrice.lt(markPrice) && t`Price below Mark Price.`;

        priceError = nextError || priceError;
      }
    }

    if (!isExistingLimits && liqPrice !== undefined && liqPrice !== null) {
      if (type === 'sl') {
        const nextError = isLong
          ? inputPrice.lt(liqPrice) && t`Price below Liq. Price.`
          : inputPrice.gt(liqPrice) && t`Price above Liq. Price.`;

        priceError = nextError || priceError;
      }
    }

    if (isExistingPosition || !isLimit) {
      if (markPrice !== undefined && markPrice !== null) {
        if (type === 'tp') {
          const nextError = isLong
            ? inputPrice.lt(markPrice) && t`Price below Mark Price.`
            : inputPrice.gt(markPrice) && t`Price above Mark Price.`;

          priceError = nextError || priceError;
        }

        if (type === 'sl') {
          const nextError = isLong
            ? inputPrice.gt(markPrice) && t`Price above Mark Price.`
            : inputPrice.lt(markPrice) && t`Price below Mark Price.`;

          priceError = nextError || priceError;
        }
      }
    } else {
      if (isExistingLimits) {
        if (
          maxLimitTrigerPrice !== undefined &&
          maxLimitTrigerPrice !== null &&
          minLimitTrigerPrice !== undefined &&
          minLimitTrigerPrice !== null
        ) {
          if (type === 'tp') {
            const nextError = isLong
              ? inputPrice.lt(maxLimitTrigerPrice) &&
                t`Price below highest Limit Price.`
              : inputPrice.gt(minLimitTrigerPrice) &&
                t`Price above lowest Limit Price.`;

            priceError = nextError || priceError;
          }

          if (type === 'sl') {
            const nextError = isLong
              ? inputPrice.gt(maxLimitTrigerPrice) &&
                t`Price above highest Limit Price.`
              : inputPrice.lt(minLimitTrigerPrice) &&
                t`Price below lowest Limit Price.`;

            priceError = nextError || priceError;
          }
        }
      } else {
        if (triggerPrice !== undefined && triggerPrice !== null) {
          if (type === 'tp') {
            const nextError = isLong
              ? inputPrice.lt(triggerPrice) && t`Price below Limit Price.`
              : inputPrice.gt(triggerPrice) && t`Price above Limit Price.`;

            priceError = nextError || priceError;
          }

          if (type === 'sl') {
            const nextError = isLong
              ? inputPrice.gt(triggerPrice) && t`Price above Limit Price.`
              : inputPrice.lt(triggerPrice) && t`Price below Limit Price.`;

            priceError = nextError || priceError;
          }
        }
      }
    }
  }

  if (type === 'limit') {
    if (entry.sizeUsd?.value === undefined || entry.sizeUsd.value?.isZero()) {
      sizeError = t`Limit size is required.`;
    }

    if (
      entry?.increaseAmounts?.estimatedLeverage &&
      entry?.increaseAmounts?.estimatedLeverage.gt(MAX_ALLOWED_LEVERAGE)
    ) {
      sizeError = t`Max leverage: ${formatLeverage(MAX_ALLOWED_LEVERAGE)}x`;
    }
  } else {
    if (
      entry.percentage?.value === undefined ||
      entry.percentage?.value?.isZero()
    ) {
      percentageError = t`A Size percentage is required.`;
    }
  }

  return {
    ...entry,
    sizeUsd: { ...entry.sizeUsd, error: sizeError },
    price: { ...entry.price, error: priceError },
    percentage: { ...entry.percentage, error: percentageError },
  };
}
