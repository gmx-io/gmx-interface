import { Trans, t } from "@lingui/macro";
import { useEffect } from "react";

import { DEFAULT_SLIPPAGE_AMOUNT, EXCESSIVE_SLIPPAGE_AMOUNT } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  selectSetTradeboxAllowedSlippage,
  selectTradeboxAllowedSlippage,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { formatPercentage } from "lib/numbers";

import PercentageInput from "components/PercentageInput/PercentageInput";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

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
    <SyntheticsInfoRow
      label={
        <TooltipWithPortal
          handle={t`Allowed Slippage`}
          position="left-start"
          content={
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
          }
        />
      }
      valueClassName="-my-5"
    >
      <PercentageInput
        onChange={setAllowedSlippage}
        negativeSign
        defaultValue={savedAllowedSlippage}
        value={allowedSlippage}
        highValue={EXCESSIVE_SLIPPAGE_AMOUNT}
        highValueWarningText={t`Slippage is too high`}
        inputId={"tradebox-allowed-slippage-input"}
      />
    </SyntheticsInfoRow>
  );
}
