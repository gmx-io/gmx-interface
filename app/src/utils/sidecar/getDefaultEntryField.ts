import { EntryField } from '@/selectors/sidecar/types';
import { removeTrailingZeros } from '@/utils/legacy/decimals';
import { formatAmount } from '@/utils/legacy/format';
import { parseValue } from '@/utils/legacy/parse';
import { BN } from '@coral-xyz/anchor';

export function getDefaultEntryField(
  decimals: number | undefined,
  { input, value, error }: Partial<EntryField> = {},
  priceDecimals?: number
): EntryField {
  let nextInput = '';
  let nextValue: BN | null = null;
  const nextError = error ?? null;

  const displayPercentage = priceDecimals ?? Math.min(2, decimals ?? 0);

  if (input) {
    nextInput = input;
    nextValue = (decimals !== undefined && parseValue(input, decimals)) || null;
  } else if (value) {
    nextInput =
      decimals !== undefined
        ? String(
            removeTrailingZeros(
              formatAmount(value, decimals, displayPercentage)
            )
          )
        : '';
    nextValue = value;
  }

  return { input: nextInput, value: nextValue, error: nextError };
}
