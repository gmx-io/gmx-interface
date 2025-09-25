import { Trans, t } from "@lingui/macro";

import { DEFAULT_SLIPPAGE_AMOUNT, EXCESSIVE_SLIPPAGE_AMOUNT } from "config/factors";
import { formatPercentage } from "lib/numbers";

import PercentageInput from "components/PercentageInput/PercentageInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function AllowedSlippageRow({
  allowedSlippage,
  setAllowedSlippage,
  slippageInputId,
}: {
  setAllowedSlippage: (value: number) => void;
  allowedSlippage: number;
  slippageInputId: string;
}) {
  return (
    <SyntheticsInfoRow
      label={
        <TooltipWithPortal
          handle={t`Allowed Slippage`}
          position="top-start"
          variant="icon"
          renderContent={() => {
            return (
              <div className="text-typography-primary">
                <Trans>
                  The maximum allowed percentage difference between the mark price and the execution price for market
                  orders. You can edit the default value in the settings menu on the top right of the page.
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
        highValueWarningText={t`Slippage is too high.`}
        inputId={slippageInputId}
        negativeSign
      />
    </SyntheticsInfoRow>
  );
}
