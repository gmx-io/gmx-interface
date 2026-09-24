import BuyInputSection from '@/components/Common/Input/BuyInputSection';
import { BN_ZERO, USD_DECIMALS } from '@/config/constants';
import {
  selectSetTradeboxTriggerPriceInputValue,
  selectTradeboxTriggerPriceInputValue,
} from '@/selectors/tradebox/baseSelectors';
import { selectTradeboxMarkPrice } from '@/selectors/tradebox/selectTradeboxMarkPrice';
import { selectTradeboxMarkPriceDecimals } from '@/selectors/tradebox/selectTradeboxMarkPriceDecimals';
import { selectTradeboxToToken } from '@/selectors/tradebox/selectTradeboxToToken';
import { formatAmount, formatUsd } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { getGmw402Enabled } from '@/config/featureFlagEnable';
import { t } from '@lingui/macro';
import { useCallback } from 'react';
import { ChangeEvent } from 'react';

export function RenderTriggerPriceInput() {
  const toToken = useAppStore(selectTradeboxToToken);
  const markPrice = useAppStore(selectTradeboxMarkPrice);
  const markPriceDecimals = useAppStore(selectTradeboxMarkPriceDecimals);
  const isGmw402Enabled = getGmw402Enabled();
  const priceInputDecimals = isGmw402Enabled ? markPriceDecimals : undefined;
  const triggerPriceInputValue = useAppStore(
    selectTradeboxTriggerPriceInputValue
  );
  const setTriggerPriceInputValue = useAppStore(
    selectSetTradeboxTriggerPriceInputValue
  );

  const setMarkPriceAsTriggerPrice = useCallback(
    () =>
      setTriggerPriceInputValue(
        formatAmount(
          markPrice ?? BN_ZERO,
          USD_DECIMALS,
          (priceInputDecimals ?? toToken?.priceDecimals) || 2
        )
      ),
    [
      markPrice,
      priceInputDecimals,
      setTriggerPriceInputValue,
      toToken?.priceDecimals,
    ]
  );

  const handleTriggerPriceInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setTriggerPriceInputValue(event.target.value),
    [setTriggerPriceInputValue]
  );

  return (
    <BuyInputSection
      topLeftLabel={t`Price`}
      topRightLabel={t`Mark`}
      topRightValue={formatUsd(markPrice, {
        displayDecimals: markPriceDecimals,
      })}
      onClickTopRightLabel={setMarkPriceAsTriggerPrice}
      inputValue={triggerPriceInputValue}
      onInputValueChange={handleTriggerPriceInputChange}
      decimalPlaces={priceInputDecimals}
    >
      USD
    </BuyInputSection>
  );
}
