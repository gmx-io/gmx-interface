import { Trans, t } from "@lingui/macro";

import { DEFAULT_SLIPPAGE_AMOUNT, EXCESSIVE_SLIPPAGE_AMOUNT } from "config/factors";
import { formatPercentage } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import PercentageInput from "components/PercentageInput/PercentageInput";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  selectSetTradeboxAllowedSlippage,
  selectTradeboxAllowedSlippage,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useEffect } from "react";
import { useTradeboxChanges } from "../hooks/useTradeboxChanges";

export function AllowedSlippageRow() {
  const { savedAllowedSlippage } = useSettings();
  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const setAllowedSlippage = useSelector(selectSetTradeboxAllowedSlippage);

  const tradeboxChanges = useTradeboxChanges();

  useEffect(() => {
    if (tradeboxChanges.direction || tradeboxChanges.toTokenAddress) {
      setAllowedSlippage(savedAllowedSlippage);
    }
  }, [tradeboxChanges.direction, tradeboxChanges.toTokenAddress, savedAllowedSlippage, setAllowedSlippage]);

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
                  You can edit the default Allowed Slippage in the settings menu on the top right of the page.
                  <br />
                  <br />
                  Note that a low allowed slippage, e.g. less than -
                  {formatPercentage(BigInt(DEFAULT_SLIPPAGE_AMOUNT), { signed: false })}, may result in failed orders if
                  prices are volatile.
                </Trans>
              </div>
            );
          }}
        />
      }
    >
      <PercentageInput
        onChange={setAllowedSlippage}
        negativeSign
        defaultValue={savedAllowedSlippage}
        value={allowedSlippage}
        highValue={EXCESSIVE_SLIPPAGE_AMOUNT}
        highValueWarningText={t`Slippage is too high`}
      />
    </ExchangeInfoRow>
  );
}
