import { createSelectionContext } from "@taskworld.com/rereselect";

import { getToken } from "sdk/configs/tokens";
import { parseValue } from "sdk/utils/numbers";

import type { GmxAccountContext } from "../GmxAccountContext";
import {
  selectGmxAccountDepositViewChain,
  selectGmxAccountDepositViewTokenAddress,
  selectGmxAccountDepositViewTokenInputValue,
  selectGmxAccountSettlementChainId,
} from "./pure";

//#endregion
//#region Derived state
const selectionContext = createSelectionContext<GmxAccountContext>();
const createSelector = selectionContext.makeSelector;
// const { inputAmount, inputAmountUsd } = useMemo((): { inputAmount?: bigint; inputAmountUsd?: bigint } => {
//   if (selectedToken === undefined) {
//     return EMPTY_OBJECT;
//   }
//   const inputAmount = parseValue(inputValue, selectedToken.decimals);
//   const inputAmountUsd = convertToUsd(
//     inputAmount,
//     selectedToken.decimals,
//     selectedTokenChainData?.sourceChainPrices?.maxPrice
//   );
//   return { inputAmount, inputAmountUsd };
// }, [inputValue, selectedToken, selectedTokenChainData?.sourceChainPrices?.maxPrice]);

export const selectGmxAccountDepositViewTokenInputAmount = createSelector((q) => {
  // const chainId = q(selectGmxAccountDepositViewChain);
  const settlementChainId = q(selectGmxAccountSettlementChainId);

  const tokenAddress = q(selectGmxAccountDepositViewTokenAddress);

  if (tokenAddress === undefined) {
    return undefined;
  }

  const inputValue = q(selectGmxAccountDepositViewTokenInputValue);

  if (inputValue === undefined) {
    return undefined;
  }

  const token = getToken(settlementChainId, tokenAddress);

  return parseValue(inputValue, token.decimals);
});

// export const selectGmxAccountDepositViewTokenInputAmountUsd = createSelector((q) => {});
