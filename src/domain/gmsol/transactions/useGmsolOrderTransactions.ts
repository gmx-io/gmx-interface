import { useCallback, useEffect, useRef, useState } from "react";
import { mutate } from "swr";

import { SOLANA_NETWORK_ID, isSolanaNetwork } from "config/chains";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { getSolanaBalancesKey } from "domain/solana/useSolanaBalances";
import { useChainId } from "lib/chains";
import { useSolanaWalletSession } from "lib/wallets/solanaWalletSession";

import { refreshGmsolAccountDataAfterTransaction } from "../useGmsolAccountData";
import { getPendingGmsolSubmission, reconcileGmsolSubmission, setPendingGmsolSubmission } from "./pendingSubmission";
import { prepareGmsolOrderTransactions, sendGmsolOrderTransactions } from "./sendOrderTransactions";
import type { GmsolOrderAction } from "./types";
import { requireGmsol } from "./validateTransaction";

/** Lazy Solana adapter for the shared order-entry/editor consumers (FESOL-19). */
export function useGmsolOrderTransactions() {
  const sdk = useGmxSdk(SOLANA_NETWORK_ID);
  const wallet = useSolanaWalletSession();
  const { networkId } = useChainId();
  const current = useRef({ wallet, networkId, sdk });
  current.current = { wallet, networkId, sdk };
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const pending = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (action: GmsolOrderAction | undefined) => {
    requireGmsol(mounted.current, "Solana order flow is closed");
    requireGmsol(!pending.current, "A Solana order is already being submitted");
    const { wallet, networkId, sdk } = current.current;
    const owner = wallet.address;
    requireGmsol(
      isSolanaNetwork(networkId) && sdk && owner && wallet.signTransaction,
      "Connect a Solana wallet before submitting an order"
    );
    pending.current = true;
    setIsSubmitting(true);
    try {
      const previous = await reconcileGmsolSubmission(owner);
      requireGmsol(mounted.current, "Solana order flow closed before signing");
      requireGmsol(
        current.current.wallet.address === owner && isSolanaNetwork(current.current.networkId),
        "Solana order session changed"
      );
      if (previous) {
        if (previous.failed || previous.operation === "prepare") setPendingGmsolSubmission(owner, undefined);
        requireGmsol(!previous.failed, "The previous transaction failed. Review the order before submitting again.");
        requireGmsol(
          previous.operation !== "prepare",
          "Previous account preparation confirmed. Submit the order again."
        );
        requireGmsol(previous.slot <= BigInt(Number.MAX_SAFE_INTEGER), "Confirmation slot exceeds API precision");
        const refreshErrors: unknown[] = [];
        await Promise.all([
          mutate(getSolanaBalancesKey(SOLANA_NETWORK_ID, owner)),
          refreshGmsolAccountDataAfterTransaction(sdk, owner, Number(previous.slot)),
        ]).catch((error) => refreshErrors.push(error));
        requireGmsol(
          mounted.current && current.current.wallet.address === owner && isSolanaNetwork(current.current.networkId),
          "Solana order session changed"
        );
        setPendingGmsolSubmission(owner, undefined);
        return { signatures: [previous.signature], slot: previous.slot, refreshErrors };
      }
      requireGmsol(action, "No valid order to submit");
      const plan = await prepareGmsolOrderTransactions({ owner, action });
      requireGmsol(mounted.current, "Solana order flow closed before signing");
      return await sendGmsolOrderTransactions({
        plan,
        getWalletAddress: () =>
          mounted.current && isSolanaNetwork(current.current.networkId) ? current.current.wallet.address : undefined,
        signTransaction: async (bytes) => {
          const session = current.current.wallet;
          requireGmsol(
            mounted.current && session.address === owner && session.signTransaction,
            "Connected Solana wallet changed"
          );
          return session.signTransaction(bytes);
        },
        onConfirmed: async ({ slot }) => {
          requireGmsol(slot <= BigInt(Number.MAX_SAFE_INTEGER), "Confirmation slot exceeds API precision");
          await Promise.all([
            mutate(getSolanaBalancesKey(SOLANA_NETWORK_ID, owner)),
            refreshGmsolAccountDataAfterTransaction(sdk, owner, Number(slot)),
          ]);
        },
      });
    } finally {
      pending.current = false;
      if (mounted.current) setIsSubmitting(false);
    }
  }, []);

  const pendingSubmission = wallet.address ? getPendingGmsolSubmission(wallet.address) : undefined;
  return {
    submit,
    isSubmitting,
    hasPendingSubmission: Boolean(pendingSubmission),
    pendingTrackExecution: pendingSubmission?.trackExecution,
  };
}
