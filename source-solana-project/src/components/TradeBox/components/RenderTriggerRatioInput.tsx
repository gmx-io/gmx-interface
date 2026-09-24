import BuyInputSection from '@/components/Common/Input/BuyInputSection';
import TokenWithIcon from '@/components/Common/TokenIcon/TokenWithIcon';
import { BN_ZERO, USD_DECIMALS } from '@/config/constants';
import {
  selectSetTradeboxTriggerRatioInputValue,
  selectTradeboxTriggerRatioInputValue,
} from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxTradeRatios } from '@/selectors/tradebox/selectTradeboxTradeRatios';
import { formatAmount } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { t } from '@lingui/macro';
import { useCallback } from 'react';
import { ChangeEvent } from 'react';

export function RenderTriggerRatioInput() {
  const { markRatio } = useAppStore(selectTradeboxTradeRatios);
  const triggerRatioInputValue = useAppStore(
    selectTradeboxTriggerRatioInputValue
  );
  const setTriggerRatioInputValue = useAppStore(
    selectSetTradeboxTriggerRatioInputValue
  );

  const handleTriggerMarkPriceClick = useCallback(
    () =>
      setTriggerRatioInputValue(
        formatAmount(markRatio?.ratio ?? BN_ZERO, USD_DECIMALS, 10)
      ),
    [markRatio?.ratio, setTriggerRatioInputValue]
  );

  const handleTriggerRatioInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTriggerRatioInputValue(event.target.value);
    },
    [setTriggerRatioInputValue]
  );

  return (
    <BuyInputSection
      topLeftLabel={t`Price`}
      topRightLabel={t`Mark`}
      topRightValue={formatAmount(markRatio?.ratio ?? BN_ZERO, USD_DECIMALS, 4)}
      onClickTopRightLabel={handleTriggerMarkPriceClick}
      inputValue={triggerRatioInputValue}
      onInputValueChange={handleTriggerRatioInputChange}
    >
      {markRatio && (
        <>
          <TokenWithIcon
            symbol={markRatio.smallestToken.symbol}
            displaySize={20}
          />{' '}
          per{' '}
          <TokenWithIcon
            symbol={markRatio.largestToken.symbol}
            displaySize={20}
          />
        </>
      )}
    </BuyInputSection>
  );
}
