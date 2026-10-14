import { isAddressEqual, maxUint256, type Address, type PublicClient } from "viem";

import type { AddTokenPermitFn } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { NON_EXPIRING_PERMIT_DEADLINE } from "domain/tokens/permitUtils";
import { getTokenPermitsAllowlist } from "domain/tokens/tokenPermitsEligibility";
import { type ErrorLike, parseError } from "lib/errors";
import { INVALID_PERMIT_SIGNATURE_ERROR, PERMIT_WALLET_CHANGED_ERROR } from "lib/errors/customErrors";
import { metrics } from "lib/metrics";
import { sendTokenPermitMetric } from "lib/metrics/tokenPermitMetrics";
import { abis } from "sdk/abis";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

/**
 * Wallet-funded One-Click orders pull collateral and the relay fee from the main wallet through the Router,
 * so activation covers the held tokens the Router can't spend yet. The gas payment token goes first.
 */
export async function getActivationPermitTokenAddresses({
  chainId,
  client,
  account,
  spender,
  gasPaymentTokenAddress,
  tokenPermits,
  getIsPermitAvailable,
}: {
  chainId: number;
  client: Pick<PublicClient, "multicall">;
  account: string;
  spender: string;
  gasPaymentTokenAddress: string | undefined;
  tokenPermits: SignedTokenPermit[];
  getIsPermitAvailable: (tokenAddress: string) => boolean;
}): Promise<string[]> {
  const candidates = getTokenPermitsAllowlist(chainId).filter((tokenAddress) => getIsPermitAvailable(tokenAddress));

  if (candidates.length === 0) {
    return [];
  }

  const results = await client.multicall({
    contracts: candidates.flatMap((tokenAddress) => [
      { address: tokenAddress, abi: abis.ERC20, functionName: "balanceOf", args: [account as Address] },
      {
        address: tokenAddress,
        abi: abis.ERC20,
        functionName: "allowance",
        args: [account as Address, spender as Address],
      },
      { address: tokenAddress, abi: abis.ERC20PermitInterface, functionName: "nonces", args: [account as Address] },
    ]),
  });

  const tokenAddresses = candidates.filter((tokenAddress, index) => {
    const [balance, allowance, nonce] = results.slice(index * 3, index * 3 + 3).map((result) => result.result);

    if (typeof balance !== "bigint" || typeof allowance !== "bigint" || typeof nonce !== "bigint") {
      return false;
    }

    // an unused permit from an earlier activation still covers the token
    const hasUsablePermit = tokenPermits.some(
      (permit) =>
        isAddressEqual(permit.token as Address, tokenAddress) &&
        isAddressEqual(permit.spender as Address, spender as Address) &&
        permit.deadline === NON_EXPIRING_PERMIT_DEADLINE &&
        BigInt(permit.onchainParams.nonce) === nonce
    );

    return balance > 0n && allowance < balance && !hasUsablePermit;
  });

  return gasPaymentTokenAddress === undefined
    ? tokenAddresses
    : [
        ...tokenAddresses.filter((tokenAddress) => isAddressEqual(tokenAddress, gasPaymentTokenAddress as Address)),
        ...tokenAddresses.filter((tokenAddress) => !isAddressEqual(tokenAddress, gasPaymentTokenAddress as Address)),
      ];
}

/**
 * One prompt per token. Declining one stops the rest: the user is opting out of the permit step, while
 * One-Click stays active and the unsigned tokens keep the approval flow.
 */
export async function signActivationTokenPermits({
  chainId,
  spender,
  tokenAddresses,
  accountType,
  addTokenPermit,
  disableTokenPermits,
}: {
  chainId: number;
  spender: string;
  tokenAddresses: string[];
  accountType: string | undefined;
  addTokenPermit: AddTokenPermitFn;
  disableTokenPermits: (tokenAddresses: string[]) => void;
}): Promise<void> {
  const failedTokenAddresses: string[] = [];

  for (const tokenAddress of tokenAddresses) {
    const metricParams = { chainId, tokenAddress, accountType, flow: "oneClickActivation" as const };

    try {
      await addTokenPermit(tokenAddress, spender, maxUint256, { deadline: NON_EXPIRING_PERMIT_DEADLINE });
      sendTokenPermitMetric({ ...metricParams, outcome: "signed" });
    } catch (error) {
      // the flow belongs to the previous account or chain; its fallback list must not be touched from here
      if (error?.message === PERMIT_WALLET_CHANGED_ERROR) {
        return;
      }

      if (parseError(error as ErrorLike)?.isUserRejectedError) {
        sendTokenPermitMetric({ ...metricParams, outcome: "rejected" });
        break;
      }

      failedTokenAddresses.push(tokenAddress);
      metrics.pushError(error, "subaccount.activationTokenPermit");
      sendTokenPermitMetric({
        ...metricParams,
        outcome: "fallback",
        reason: error?.message?.includes(INVALID_PERMIT_SIGNATURE_ERROR) ? "invalidSignature" : "failed",
      });
    }
  }

  // one write: the fallback list setter reads its value from the render the flow started in
  if (failedTokenAddresses.length > 0) {
    disableTokenPermits(failedTokenAddresses);
  }
}
