import BuyInputSection from '@/components/Common/Input/BuyInputSection';
import { BN_100, BN_ZERO, USD_DECIMALS } from '@/config/constants';
import {
  selectSetTradeboxCloseSizeInputValue,
  selectTradeboxCloseSizeInputValue,
} from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxCloseSize } from '@/selectors/tradebox/selectTradeboxCloseSize';
import { selectTradeboxSelectedPosition } from '@/selectors/tradebox/selectTradeboxSelectedPosition';
import { formatAmount, formatUsd } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { useCallback } from 'react';

export function RenderDecreaseSizeInput() {
  const selectedPosition = useAppStore(selectTradeboxSelectedPosition);
  const closeSizeUsd = useAppStore(selectTradeboxCloseSize);
  const closeSizeInputValue = useAppStore(selectTradeboxCloseSizeInputValue);
  const setCloseSizeInputValue = useAppStore(
    selectSetTradeboxCloseSizeInputValue
  );

  const handleCloseInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setCloseSizeInputValue(event.target.value),
    [setCloseSizeInputValue]
  );

  const setMaxCloseSize = useCallback(
    () =>
      setCloseSizeInputValue(
        formatAmount(
          selectedPosition?.sizeInUsd ?? BN_ZERO,
          USD_DECIMALS,
          USD_DECIMALS,
          false,
          true
        )
      ),
    [selectedPosition?.sizeInUsd, setCloseSizeInputValue]
  );

  const handleClosePercentageChange = useCallback(
    (percent: number) =>
      setCloseSizeInputValue(
        formatAmount(
          (selectedPosition?.sizeInUsd ?? BN_ZERO)
            .mul(new BN(percent))
            .div(BN_100),
          USD_DECIMALS,
          2
        )
      ),
    [selectedPosition?.sizeInUsd, setCloseSizeInputValue]
  );

  return (
    <BuyInputSection
      topLeftLabel={t`Close`}
      topRightLabel={selectedPosition?.sizeInUsd ? `Max` : undefined}
      topRightValue={
        selectedPosition?.sizeInUsd
          ? formatUsd(selectedPosition.sizeInUsd)
          : undefined
      }
      inputValue={closeSizeInputValue}
      onInputValueChange={handleCloseInputChange}
      onClickTopRightLabel={setMaxCloseSize}
      showMaxButton={Boolean(
        selectedPosition?.sizeInUsd &&
          selectedPosition.sizeInUsd.gt(BN_ZERO) &&
          !closeSizeUsd?.eq(selectedPosition.sizeInUsd)
      )}
      onClickMax={setMaxCloseSize}
      showPercentSelector={
        selectedPosition?.sizeInUsd
          ? selectedPosition.sizeInUsd.gt(BN_ZERO)
          : false
      }
      onPercentChange={handleClosePercentageChange}
    >
      USD
    </BuyInputSection>
  );
}
