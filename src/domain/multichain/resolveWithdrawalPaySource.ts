import type { GmPaySource } from "domain/synthetics/markets/types";
import { getBalanceByBalanceType } from "domain/synthetics/tokens/utils";
import type { TokenData } from "domain/tokens";
import type { SourceChainId } from "sdk/configs/chains";

import { paySourceToTokenBalanceType } from "./paySourceToTokenBalanceType";

function getPaySourceBalance({
  token,
  paySource,
  isSourceChainBalanceLoading,
}: {
  token: TokenData;
  paySource: GmPaySource;
  isSourceChainBalanceLoading: boolean;
}): bigint | undefined {
  if (paySource === "sourceChain") {
    return isSourceChainBalanceLoading ? undefined : token.sourceChainBalance ?? 0n;
  }

  return getBalanceByBalanceType(token, paySourceToTokenBalanceType(paySource));
}

export function resolveWithdrawalPaySource({
  paySource,
  srcChainId,
  token,
  isSourceChainBalanceLoading,
}: {
  paySource: GmPaySource;
  srcChainId: SourceChainId | undefined;
  token: TokenData | undefined;
  isSourceChainBalanceLoading: boolean;
}): GmPaySource {
  if (!token) {
    return paySource;
  }

  const balance = getPaySourceBalance({ token, paySource, isSourceChainBalanceLoading });

  if (balance === undefined || balance > 0n) {
    return paySource;
  }

  const otherPaySource: GmPaySource =
    paySource !== "gmxAccount" ? "gmxAccount" : srcChainId === undefined ? "settlementChain" : "sourceChain";
  const otherBalance = getPaySourceBalance({ token, paySource: otherPaySource, isSourceChainBalanceLoading });

  return otherBalance !== undefined && otherBalance > 0n ? otherPaySource : paySource;
}
