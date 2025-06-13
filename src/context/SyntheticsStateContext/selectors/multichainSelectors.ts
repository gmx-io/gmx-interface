import { isSourceChain } from "domain/multichain/config";

import { createSelector } from "../utils";
import { selectSrcChainId } from "./globalSelectors";

export const selectSourceChainId = createSelector((q) => {
  const chainId = q(selectSrcChainId);

  if (!chainId || !isSourceChain(chainId)) {
    return undefined;
  }

  return chainId;
});
