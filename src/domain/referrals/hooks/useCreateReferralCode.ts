import { t } from "@lingui/macro";
import { getAccount } from "@wagmi/core";
import { useState } from "react";

import type { ContractsChainId } from "config/chains";
import { getCodeError, getReferralCodeTakenStatus } from "domain/referrals/utils/referralsHelper";
import type { WalletSigner } from "lib/wallets";
import { getPublicClientWithRpc, getWagmiConfig } from "lib/wallets/walletConfig";

import { registerReferralCode } from "./index";

export function useCreateReferralCode({
  chainId,
  account,
  signer,
  onSuccess,
}: {
  chainId: ContractsChainId;
  account: string;
  signer: WalletSigner | undefined;
  onSuccess: (code: string) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function createCode(value: string) {
    const code = value.trim();
    const validationError = getCodeError(code);
    if (!code || validationError) {
      setError(validationError || t`Enter a code`);
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(undefined);
    try {
      const { takenStatus, failedChains } = await getReferralCodeTakenStatus(account, code, chainId);
      if (failedChains.includes(chainId)) {
        setError(t`Unable to verify code availability. Please try again.`);
        return;
      }
      if (takenStatus !== "none") {
        setError(t`Code already taken`);
        return;
      }
      const wallet = getAccount(getWagmiConfig());
      if (!signer || wallet.address !== account || wallet.chainId !== chainId) {
        setError(t`Your wallet changed. Please try again.`);
        return;
      }
      const tx = await registerReferralCode(chainId, code, signer, {
        sentMsg: t`Referral code submitted`,
        failMsg: t`Referral code creation failed`,
      });
      const receipt = await getPublicClientWithRpc(chainId).waitForTransactionReceipt({
        hash: tx.hash as `0x${string}`,
      });
      if (receipt.status !== "success") throw new Error("Referral code transaction reverted");
      onSuccess(code);
    } catch (_error) {
      setError(t`Referral code creation failed. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { createCode, isSubmitting, error };
}
