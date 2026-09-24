import { Trans, t } from '@lingui/macro';
import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import PercentageInput from '@/components/Common/Input/PercentageInput';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import {
  DEFAULT_SLIPPAGE_AMOUNT,
  EXCESSIVE_SLIPPAGE_AMOUNT,
} from '@/config/factors';
import { formatPercentage } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { selectSavedAllowedSlippage } from '@/selectors/setting/baseSelectors';
import { selectSetSavedAllowedSlippage } from '@/selectors/setting/baseSelectors';

export function PositionSellerAllowedSlippageRow() {
  const allowedSlippage = useAppStore(selectSavedAllowedSlippage);
  const setAllowedSlippage = useAppStore(selectSetSavedAllowedSlippage);

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
                  {formatPercentage(DEFAULT_SLIPPAGE_AMOUNT, 2, {
                    signed: false,
                  })}
                  , may result in failed orders if prices are volatile.
                </Trans>
              </div>
            );
          }}
        />
      }
    >
      <PercentageInput
        onChange={setAllowedSlippage}
        defaultValue={allowedSlippage}
        value={allowedSlippage}
        highValue={EXCESSIVE_SLIPPAGE_AMOUNT}
        highValueWarningText={t`Slippage is too high`}
        negativeSign
      />
    </ExchangeInfoRow>
  );
}
