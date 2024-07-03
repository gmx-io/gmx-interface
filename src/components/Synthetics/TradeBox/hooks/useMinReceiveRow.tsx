import { t } from "@lingui/macro";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useTradeboxToTokenAddress, useTradeboxTradeFlags } from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { selectTradeboxSwapAmounts } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { applySlippageToMinOut } from "domain/synthetics/trade";
import { formatTokenAmount } from "lib/numbers";
import { getByKey } from "lib/objects";

export function useMinReceiveRow(allowedSlippage: number) {
  const { isMarket, isSwap } = useTradeboxTradeFlags();
  const swapAmounts = useSelector(selectTradeboxSwapAmounts);

  const tokenData = useTokensData();

  const toTokenAddress = useTradeboxToTokenAddress();
  const toToken = getByKey(tokenData, toTokenAddress);

  if (!isSwap) {
    return null;
  }

  return (
    <ExchangeInfo.Row label={t`Min. Receive`}>
      {isMarket && swapAmounts?.minOutputAmount
        ? formatTokenAmount(
            applySlippageToMinOut(allowedSlippage, swapAmounts.minOutputAmount),
            toToken?.decimals,
            toToken?.symbol
          )
        : formatTokenAmount(swapAmounts?.minOutputAmount, toToken?.decimals, toToken?.symbol)}
    </ExchangeInfo.Row>
  );
}
