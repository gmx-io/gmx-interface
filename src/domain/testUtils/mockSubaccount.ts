import { maxUint256, zeroAddress, zeroHash } from "viem";

import { ARBITRUM } from "config/chains";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";
import { ZERO_DATA } from "sdk/utils/hash";
import type { IAbstractSigner } from "sdk/utils/signer";
import type { Subaccount } from "sdk/utils/subaccount/types";

export const MOCK_SUBACCOUNT_ADDRESS = "0x00000000000000000000000000000000000005ac";

/**
 * An active, non-expired One-Click Trading subaccount. The approval is the canonical
 * "empty approval" shape (mirrors getEmptySubaccountApproval), which every validity
 * check treats as valid, so validity comes from onchainData alone — no signatures needed.
 */
export function createMockSubaccount(): Subaccount {
  return {
    address: MOCK_SUBACCOUNT_ADDRESS,
    chainId: ARBITRUM,
    signerChainId: ARBITRUM,
    signer: {} as IAbstractSigner,
    signedApproval: {
      subaccount: MOCK_SUBACCOUNT_ADDRESS,
      shouldAdd: false,
      expiresAt: 0n,
      maxAllowedCount: 0n,
      actionType: SUBACCOUNT_ORDER_ACTION,
      nonce: 0n,
      deadline: maxUint256,
      desChainId: BigInt(ARBITRUM),
      signature: ZERO_DATA,
      signedAt: 0,
      integrationId: zeroHash,
      subaccountRouterAddress: zeroAddress,
      signatureChainId: ARBITRUM,
    },
    onchainData: {
      active: true,
      maxAllowedCount: 100n,
      currentActionsCount: 0n,
      // far future so the subaccount never reads as expired in tests
      expiresAt: BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60),
      approvalNonce: 0n,
      multichainApprovalNonce: 0n,
      integrationId: undefined,
    },
  };
}
