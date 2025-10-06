import { t } from "@lingui/macro";
import { Trans } from "@lingui/macro";
import { Address, hashMessage, PublicClient, WalletClient } from "viem";

import { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { GLP_DISTRIBUTION_ID } from "domain/synthetics/claims/useUserClaimableAmounts";
import { helperToast } from "lib/helperToast";
import { WalletSigner } from "lib/wallets";
import { AccountType } from "lib/wallets/useAccountType";
import { abis } from "sdk/abis";

import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

/**
 * keccak256("isValidSignature(bytes32,bytes)")
 * @see https://eips.ethereum.org/EIPS/eip-1271
 */
const VALID_SIGNATURE_RESPONSE = "0x1626ba7e";
const CLAIM_TERMS_HASH = "0x09335c037e73849fe301478f91674da05757165154d1dccb1b881c1846938f3d";

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
  account: Address;
  publicClient: PublicClient;
  claimTerms: string;
  claimTermsAcceptedSignature: string | undefined;
}) {
  const message = getMessage({ chainId, claimTerms });
  const hash = hashMessage(message);

  const [inMemorySignatureResponse, onchainSignatureResponse] = (await Promise.all([
    publicClient.readContract({
      address: account,
      abi: abis.SmartAccount,
      functionName: "isValidSignature",
      args: [hash, claimTermsAcceptedSignature ?? "0x"],
    }),
    publicClient.readContract({
      address: account,
      abi: abis.SmartAccount,
      functionName: "isValidSignature",
      args: [CLAIM_TERMS_HASH, "0x"],
    }),
  ])) as [string, string];

  return (
    inMemorySignatureResponse?.toLowerCase() === VALID_SIGNATURE_RESPONSE ||
    onchainSignatureResponse?.toLowerCase() === VALID_SIGNATURE_RESPONSE
  );
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
      account: account as Address,
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
          <div className="flex flex-col gap-10">
            <div className="text-body-medium font-bold">
              <Trans>Unable to sign with Safe via provider. Ensure your wallet supports Safe multisig signing</Trans>
            </div>
            <ToastifyDebug error={error?.message ?? error.toString()} />
          </div>
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
        helperToast.error(
          <div className="flex flex-col gap-10">
            <div className="text-body-medium font-bold">
              <Trans>Unable to sign message with smart account</Trans>
            </div>
            <ToastifyDebug error={error?.message ?? error.toString()} />
          </div>
        );
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
    helperToast.error(
      <div className="flex flex-col gap-10">
        <div className="text-body-medium font-bold">
          <Trans>Unable to sign message with EOA</Trans>
        </div>
        <ToastifyDebug error={error?.message ?? error.toString()} />
      </div>
    );
  }
}
