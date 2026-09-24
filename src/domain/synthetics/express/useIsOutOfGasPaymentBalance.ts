import { useMemo } from "react";
import { useAccount } from "wagmi";

import { TokenBalanceType } from "domain/tokens";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { getGasPaymentTokens, getRelayerFeeToken } from "sdk/configs/express";
import { estimateBatchMinGasPaymentTokenAmount } from "sdk/utils/fees/executionFee";

import { useGasLimits, useGasPrice } from "../fees";
import { getBalanceByBalanceType, useTokensDataRequest } from "../tokens";
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
    if (!account || !gasPaymentTokens || !relayFeeToken || gasPrice === undefined || !gasLimits || !tokensData) {
      return { isWalletOutOfGasPaymentBalance: false, isGmxAccountOutOfGasPaymentBalance: false };
    }

    const isOutOfGasPaymentBalance = (balanceType: TokenBalanceType) =>
      gasPaymentTokens.every((token) => {
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
          isGmxAccount: balanceType === TokenBalanceType.GmxAccount,
        });
        const balance = getBalanceByBalanceType(token, balanceType);

        return balance === undefined || balance < minBalance;
      });

    return {
      isWalletOutOfGasPaymentBalance: isOutOfGasPaymentBalance(TokenBalanceType.Wallet),
      isGmxAccountOutOfGasPaymentBalance: isOutOfGasPaymentBalance(TokenBalanceType.GmxAccount),
    };
  }, [account, chainId, gasLimits, gasPaymentTokens, gasPrice, l1Reference, relayFeeToken, tokensData]);
}
