import { useMemo } from "react";

import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { getGasPaymentTokens, getRelayerFeeToken } from "sdk/configs/express";
import { estimateMinGasPaymentTokenBalance } from "sdk/utils/fees/executionFee";

import { useGasLimits, useGasPrice } from "../fees";
import { useTokensDataRequest } from "../tokens";
import { useL1ExpressOrderGasReference } from "./useL1ExpressGasReference";

export function useIsOutOfGasPaymentBalance() {
  const { chainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId);
  const gasPrice = useGasPrice(chainId);
  const gasLimits = useGasLimits(chainId);
  const l1Reference = useL1ExpressOrderGasReference();

  const gasPaymentTokens = getGasPaymentTokens(chainId).map((address) => getByKey(tokensData, address));
  const relayFeeToken = getByKey(tokensData, getRelayerFeeToken(chainId).address);

  return useMemo(() => {
    if (!gasPaymentTokens || !relayFeeToken || gasPrice === undefined || !gasLimits || !tokensData) {
      return false;
    }

    const conditions = gasPaymentTokens.map((token) => {
      if (!token) {
        return false;
      }

      const minBalance = estimateMinGasPaymentTokenBalance({
        gasLimits,
        gasPaymentToken: token,
        relayFeeToken,
        gasPrice,
        l1Reference,
        tokensData,
        chainId,
      });

      return token.balance === undefined || token.balance < minBalance;
    });

    return conditions.every((condition) => condition);
  }, [chainId, gasLimits, gasPaymentTokens, gasPrice, l1Reference, relayFeeToken, tokensData]);
}
