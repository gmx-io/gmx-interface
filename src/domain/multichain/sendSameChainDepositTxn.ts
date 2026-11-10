import type { PublicClient } from "viem";

import type { SettlementChainId } from "config/chains";
import { getContract } from "config/contracts";
import { getTokenPermitIssueType, type WalletTxnTokenPermits } from "domain/tokens/useTokenPermitTxnHandlers";
import { prepareWalletTxnTokenPermits, sendWithWalletTxnTokenPermits } from "domain/tokens/walletTxnTokenPermits";
import { TxnCallback, TxnEventBuilder, WalletTxnCtx, sendWalletTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { applyGasLimitBuffer } from "sdk/utils/gas/applyBuffer";
import { buildSameChainDepositTxn } from "sdk/utils/multichain/api";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

export type SameChainDepositTxnCtx = {
  /** Permits the deposit carries, empty when it relies on the allowance */
  tokenPermits: SignedTokenPermit[];
};

export async function sendSameChainDepositTxn({
  chainId,
  signer,
  tokenAddress,
  amount,
  account,
  callback,
  walletTxnTokenPermits,
}: {
  chainId: SettlementChainId;
  signer: WalletSigner;
  tokenAddress: string;
  amount: bigint;
  account: string;
  callback?: TxnCallback<SameChainDepositTxnCtx>;
  walletTxnTokenPermits?: WalletTxnTokenPermits;
}) {
  const eventBuilder = new TxnEventBuilder<SameChainDepositTxnCtx>({ tokenPermits: [] });
  let tokenPermits: SignedTokenPermit[];

  try {
    tokenPermits = await prepareWalletTxnTokenPermits({
      chainId,
      walletTxnTokenPermits,
      multicall: [{ method: "sendTokens", params: [tokenAddress, getContract(chainId, "MultichainVault"), amount] }],
    });
  } catch (error) {
    callback?.(eventBuilder.Error(error));
    throw error;
  }

  eventBuilder.ctx = { tokenPermits };

  const txn = buildSameChainDepositTxn({ chainId, tokenAddress, amount, account, tokenPermits });

  await sendWithWalletTxnTokenPermits({
    walletTxnTokenPermits,
    tokenPermits,
    send: async (onPendingTxnSuccess) => {
      let gasLimit: bigint | undefined;

      // sendWalletTransaction leaves a failed estimate to the wallet, but a bad permit must stop here, before a
      // transaction that would revert, so its token can go back to the Approve button
      if (tokenPermits.length > 0) {
        try {
          gasLimit = await estimateDepositTxnGas(getPublicClientWithRpc(chainId), account, txn);
        } catch (error) {
          if (getTokenPermitIssueType(error, tokenPermits, { isAnyContext: true }) !== undefined) {
            callback?.(eventBuilder.Error(error));
            throw error;
          }
        }
      }

      const result = await sendWalletTransaction({
        chainId,
        signer,
        to: txn.to,
        callData: txn.data,
        value: txn.value,
        gasLimit,
        callback: callback ? (event) => callback(eventBuilder.extend<WalletTxnCtx>(event)) : undefined,
      });

      if (onPendingTxnSuccess) {
        result
          .wait()
          .then(({ status }) => {
            if (status === "success") {
              onPendingTxnSuccess();
            }
          })
          .catch(() => undefined);
      }

      return result;
    },
  });
}

export async function estimateSameChainDepositGas({
  chainId,
  client,
  tokenAddress,
  amount,
  account,
  tokenPermits,
}: {
  chainId: SettlementChainId;
  client: PublicClient;
  tokenAddress: string;
  amount: bigint;
  account: string;
  tokenPermits?: SignedTokenPermit[];
}): Promise<bigint> {
  return estimateDepositTxnGas(
    client,
    account,
    buildSameChainDepositTxn({ chainId, tokenAddress, amount, account, tokenPermits })
  );
}

async function estimateDepositTxnGas(
  client: PublicClient,
  account: string,
  txn: ReturnType<typeof buildSameChainDepositTxn>
): Promise<bigint> {
  const gas = await client.estimateGas({ account, to: txn.to, data: txn.data, value: txn.value });

  return applyGasLimitBuffer(gas);
}
