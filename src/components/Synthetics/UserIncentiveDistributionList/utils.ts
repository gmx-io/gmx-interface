import { t } from "@lingui/macro";
import { hashMessage, PublicClient, WalletClient } from "viem";

import { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { GLP_DISTRIBUTION_ID } from "domain/synthetics/claims/useUserClaimableAmounts";
import { helperToast } from "lib/helperToast";
import { WalletSigner } from "lib/wallets";
import { AccountType } from "lib/wallets/useAccountType";
import { abis } from "sdk/abis";

function getMessage({ chainId, claimTerms }) {
  return `${claimTerms}\ndistributionId ${GLP_DISTRIBUTION_ID}\ncontract ${getContract(chainId, "ClaimHandler").toLowerCase()}\nchainId ${chainId}`;
}

export async function checkValidity({
  chainId,
  account,
  publicClient,
  claimTerms,
  claimTermsAcceptedSignature,
}: {
  chainId: ContractsChainId;
  account: string;
  publicClient: PublicClient;
  claimTerms: string;
  claimTermsAcceptedSignature: string;
}) {
  const message = getMessage({ chainId, claimTerms });
  const hash = hashMessage(message);
  const magic = (await publicClient.readContract({
    address: account as `0x${string}`,
    abi: abis.SmartAccount,
    functionName: "isValidSignature",
    args: [hash, claimTermsAcceptedSignature as `0x${string}`],
  })) as `0x${string}`;

  return magic?.toLowerCase() === "0x1626ba7e";
}

export async function beginSignatureProcess({
  account,
  accountType,
  message,
  signer,
  walletClient,
  chainId,
  publicClient,
  claimTerms,
  onFinish,
  onError,
}: {
  account: string;
  accountType: AccountType;
  message: string;
  walletClient: WalletClient;
  chainId: ContractsChainId;
  publicClient: PublicClient;
  claimTerms: string;
  signer: WalletSigner;
  onFinish: (signature: string) => void;
  onError: (error: any) => void;
}) {
  try {
    let signature: string | undefined;
    if (accountType === AccountType.SmartAccount) {
      if (walletClient && account) {
        signature = (await walletClient.signMessage({ account: account as `0x${string}`, message })) as string;
      } else if (signer) {
        signature = await signer.signMessage(message);
      }
    }

    if (accountType === AccountType.Safe) {
      signature = (await walletClient.signMessage({ account: account as `0x${string}`, message })) as string;
    }

    if (!signature || !signature.startsWith("0x")) {
      return;
    }

    const isValid = await checkValidity({
      chainId,
      account,
      publicClient,
      claimTerms,
      claimTermsAcceptedSignature: signature,
    });

    if (isValid) {
      onFinish(signature);
    }
  } catch (error) {
    onError(error);
  }
}

export async function signMessage({
  accountType,
  account,
  walletClient,
  chainId,
  publicClient,
  claimTerms,
  setClaimTermsAcceptedSignature,
  onFinishMultisig,
  setIsStartedMultisig,
  signer,
}: {
  accountType: AccountType;
  account: string;
  walletClient: WalletClient;
  chainId: ContractsChainId;
  publicClient: PublicClient;
  claimTerms: string;
  onFinishMultisig: (signature: string) => void;
  setClaimTermsAcceptedSignature: (signature: string) => void;
  setIsStartedMultisig: (isStartedMultisig: boolean) => void;
  signer: WalletSigner;
}) {
  const message = getMessage({ chainId, claimTerms });

  if (accountType === AccountType.Safe) {
    beginSignatureProcess({
      account,
      message,
      walletClient,
      chainId,
      publicClient,
      claimTerms,
      accountType,
      signer,
      onFinish: onFinishMultisig,
      onError: (error) => {
        helperToast.error(
          t`Unable to sign with Safe via provider. Ensure your wallet supports Safe multisig signing. Error: ` +
            (error?.message ?? error.toString())
        );
      },
    });
    setIsStartedMultisig(true);

    helperToast.info(
      t`Please continue signing on your wallet interface where the signature request should appear. You will be able to claim once all signers have signed.`
    );
    return;
  }

  if (accountType === AccountType.SmartAccount) {
    beginSignatureProcess({
      account,
      message,
      walletClient,
      chainId,
      publicClient,
      claimTerms,
      accountType,
      signer,
      onFinish: onFinishMultisig,
      onError: (error) => {
        helperToast.error(t`Unable to sign message with smart account. Error: ` + (error?.message ?? error.toString()));
      },
    });
    return;
  }

  try {
    const signature = await signer?.signMessage(message);
    if (signature && signature.startsWith("0x")) {
      setClaimTermsAcceptedSignature(signature);
    }
  } catch (error: any) {
    helperToast.error(t`Unable to sign message with EOA. Error: ` + (error?.message ?? error.toString()));
  }
}
