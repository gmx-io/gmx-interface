import { Trans, t } from "@lingui/macro";

import { DEFAULT_SLIPPAGE_AMOUNT, EXCESSIVE_SLIPPAGE_AMOUNT } from "config/factors";
import { formatPercentage } from "lib/numbers";

import PercentageInput from "components/PercentageInput/PercentageInput";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function AllowedSlippageRow({
  allowedSlippage,
  setAllowedSlippage,
}: {
  setAllowedSlippage: (value: number) => void;
  allowedSlippage: number;
}) {
  return (
    <SyntheticsInfoRow
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
      valueClassName="-my-5"
    >
      <PercentageInput
        onChange={setAllowedSlippage}
        defaultValue={allowedSlippage}
        value={allowedSlippage}
        highValue={EXCESSIVE_SLIPPAGE_AMOUNT}
        highValueWarningText={t`Slippage is too high`}
        inputId={"position-seller-allowed-slippage-input"}
        negativeSign
      />
    </SyntheticsInfoRow>
  );
}
