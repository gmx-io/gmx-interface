import { Trans } from "@lingui/macro";

import {
  selectTradeboxSwapAmounts,
  selectTradeboxToToken,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { applySlippageToMinOut } from "domain/synthetics/trade";
import { expandDecimals, formatBalanceAmount, formatTokenAmount } from "lib/numbers";

import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";

// More than the total supply of any token, so a bigger amount can't be real (e.g. a 15-digit BTC pay into PEPE):
// it reads "> 1,000,000,000,000,000.00 PEPE" and stays inside the row; real amounts stay exact
const MAX_REAL_TOKEN_AMOUNT = "1000000000000000";

export function MinReceiveRow({ allowedSlippage }: { allowedSlippage: number }) {
  const { isMarket, isSwap } = useSelector(selectTradeboxTradeFlags);
  const swapAmounts = useSelector(selectTradeboxSwapAmounts);

  const toToken = useSelector(selectTradeboxToToken);

  if (!isSwap || swapAmounts?.minOutputAmount === undefined || !toToken) {
    return null;
  }

  // For both directions, display the on-chain minimum after slippage.
  // "from": minOutputAmount is the expected output, slippage reduces it
  // "to": minOutputAmount is inflated so that after slippage it equals the desired amount
  const displayMinReceive = isMarket
    ? applySlippageToMinOut(allowedSlippage, swapAmounts.minOutputAmount)
    : swapAmounts.minOutputAmount;

  return (
    <SyntheticsInfoRow label={<Trans>Minimum receive</Trans>} valueClassName="numbers">
      {displayMinReceive > BigInt(MAX_REAL_TOKEN_AMOUNT) * expandDecimals(1, toToken.decimals)
        ? formatTokenAmount(displayMinReceive, toToken.decimals, toToken.symbol, {
            useCommas: true,
            displayDecimals: 2,
            maxThreshold: MAX_REAL_TOKEN_AMOUNT,
          })
        : formatBalanceAmount(displayMinReceive, toToken.decimals, toToken.symbol, {
            isStable: toToken.isStable,
          })}
    </SyntheticsInfoRow>
  );
}
