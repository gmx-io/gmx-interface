import { Trans, t } from "@lingui/macro";

import { DEFAULT_SLIPPAGE_AMOUNT, EXCESSIVE_SLIPPAGE_AMOUNT } from "config/factors";
import { bigNumberify, formatPercentage } from "lib/numbers";

import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import PercentageInput from "components/PercentageInput/PercentageInput";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function AllowedSlippageRow({
  defaultSlippage,
  setSlippage,
}: {
  defaultSlippage: number;
  setSlippage: (value: number) => void;
}) {
  return (
    <ExchangeInfoRow
      label={
        <TooltipWithPortal
          handle={t`Allowed Slippage`}
          position="left-top"
          renderContent={() => {
            return (
              <div className="text-white">
                <Trans>
                  You can edit the default Allowed Slippage in the settings menu on the top right of the page.
                  <br />
                  <br />
                  Note that a low allowed slippage, e.g. less than -
                  {formatPercentage(bigNumberify(DEFAULT_SLIPPAGE_AMOUNT), { signed: false })}, may result in failed
                  orders if prices are volatile.
                </Trans>
              </div>
            );
          }}
        />
      }
    >
      <PercentageInput
        onChange={setSlippage}
        negativeSign
        defaultValue={defaultSlippage}
        highValue={EXCESSIVE_SLIPPAGE_AMOUNT}
        highValueWarningText={t`Slippage is too high`}
      />
    </ExchangeInfoRow>
  );
}
