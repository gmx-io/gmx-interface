import PercentageInput from '@/components/Common/Input/PercentageInput';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import {
  DEFAULT_SLIPPAGE_AMOUNT,
  EXCESSIVE_SLIPPAGE_AMOUNT,
} from '@/config/factors';
import { useTradeboxChanges } from '@/hooks/tradeboxHooks/useTradeBoxChanges';
import { useAppStore } from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import { useEffect, useMemo } from 'react';
import { selectSetSavedAllowedSlippage } from '@/selectors/setting/baseSelectors';
import { selectSavedAllowedSlippage } from '@/selectors/setting/baseSelectors';
import { formatPercentage } from '@/utils/legacy/format';

export function AllowedSlippageRow() {
  const savedAllowedSlippage = useAppStore(selectSavedAllowedSlippage);
  const setSavedAllowedSlippage = useAppStore(selectSetSavedAllowedSlippage);
  const tradeboxChanges = useTradeboxChanges();

  const defaultSlippage = useMemo(() => {
    return formatPercentage(DEFAULT_SLIPPAGE_AMOUNT, 2, {
      fallbackToZero: true,
      signed: false,
    });
  }, []);

  const shouldUpdateSlippage = useMemo(() => {
    return Boolean(tradeboxChanges.direction || tradeboxChanges.toTokenAddress);
  }, [tradeboxChanges.direction, tradeboxChanges.toTokenAddress]);

  useEffect(() => {
    if (shouldUpdateSlippage) {
      setSavedAllowedSlippage(savedAllowedSlippage);
    }
  }, [shouldUpdateSlippage, savedAllowedSlippage, setSavedAllowedSlippage]);

  return (
    <ExchangeInfoRow
      label={
        <TooltipWithPortal
          handle={t`Allowed Slippage`}
          position="top-start"
          renderContent={() => {
            return (
              <div className="text-white">
                <Trans>
                  You can edit the default Allowed Slippage in the settings menu
                  on the top right of the page.
                  <br />
                  <br />
                  Note that a low allowed slippage, e.g. less than -
                  {defaultSlippage}, may result in failed orders if prices are
                  volatile.
                </Trans>
              </div>
            );
          }}
        />
      }
    >
      <PercentageInput
        onChange={setSavedAllowedSlippage}
        negativeSign
        defaultValue={savedAllowedSlippage}
        value={savedAllowedSlippage}
        highValue={EXCESSIVE_SLIPPAGE_AMOUNT}
        highValueWarningText={t`Slippage is too high`}
      />
    </ExchangeInfoRow>
  );
}
