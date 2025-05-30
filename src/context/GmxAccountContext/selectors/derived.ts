import { createSelectionContext } from "@taskworld.com/rereselect";

import { getToken } from "sdk/configs/tokens";
import { parseValue } from "sdk/utils/numbers";

import type { GmxAccountContext } from "../GmxAccountContext";
import {
  selectGmxAccountDepositViewTokenAddress,
  selectGmxAccountDepositViewTokenInputValue,
  selectGmxAccountSettlementChainId,
} from "./pure";

const selectionContext = createSelectionContext<GmxAccountContext>();
const createSelector = selectionContext.makeSelector;

export const selectGmxAccountDepositViewTokenInputAmount = createSelector((q) => {
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
