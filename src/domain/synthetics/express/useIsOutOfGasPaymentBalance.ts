import { useMemo } from "react";
import { useAccount } from "wagmi";

import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { getGasPaymentTokens, getRelayerFeeToken } from "sdk/configs/express";
import { estimateBatchMinGasPaymentTokenAmount } from "sdk/utils/fees/executionFee";

import { useGasLimits, useGasPrice } from "../fees";
import { useTokensDataRequest } from "../tokens";
import { useL1ExpressOrderGasReference } from "./useL1ExpressGasReference";

export function useIsOutOfGasPaymentBalance() {
  const { chainId, srcChainId } = useChainId();
  const { address: account } = useAccount();
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const gasPrice = useGasPrice(chainId);
  const gasLimits = useGasLimits(chainId);
  const l1Reference = useL1ExpressOrderGasReference();

  const gasPaymentTokens = getGasPaymentTokens(chainId).map((address) => getByKey(tokensData, address));
  const relayFeeToken = getByKey(tokensData, getRelayerFeeToken(chainId).address);

  return useMemo(() => {
    if (!account) {
      return false;
    }

    if (!gasPaymentTokens || !relayFeeToken || gasPrice === undefined || !gasLimits || !tokensData) {
      return false;
    }

    const conditions = gasPaymentTokens.map((token) => {
      if (!token) {
        return false;
      }

      const minBalance = estimateBatchMinGasPaymentTokenAmount({
        gasLimits,
        gasPaymentToken: token,
        relayFeeToken,
        gasPrice,
        l1Reference,
        tokensData,
        chainId,
        executionFeeAmount: undefined,
        createOrdersCount: 1,
        updateOrdersCount: 0,
        cancelOrdersCount: 0,
        isGmxAccount: srcChainId !== undefined,
      });

      return token.balance === undefined || token.balance < minBalance;
    });

    return conditions.every((condition) => condition);
  }, [account, chainId, gasLimits, gasPaymentTokens, gasPrice, l1Reference, relayFeeToken, srcChainId, tokensData]);
}
