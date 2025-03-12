import { ethers, Signer } from "ethers";
import { getContract } from "config/contracts";
import { getGelatoRelayRouterDomain, signTypedData } from "./signing";
import SubaccountGelatoRelayRouterAbi from "sdk/abis/SubaccountGelatoRelayRouter.json";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";

/**
 * SubaccountApproval structure as defined in the contract
 */
export interface SubaccountApproval {
  subaccount: string;
  shouldAdd: boolean;
  expiresAt: bigint;
  maxAllowedCount: bigint;
  actionType: string;
  nonce: bigint;
  deadline: bigint;
  signature: string;
}

/**
 * Get the current nonce for subaccount approval
 * @param chainId Chain ID
 * @param mainAccount Main account address
 * @param subaccountAddress Subaccount address
 * @param provider Ethers provider
 * @returns Current nonce as bigint
 */
export async function getSubaccountApprovalNonce(
  chainId: number,
  mainAccount: string,

  provider: ethers.Provider
): Promise<bigint> {
  const routerAddress = getContract(chainId, "SubaccountGelatoRelayRouter");
  const subaccountRouter = new ethers.Contract(routerAddress, SubaccountGelatoRelayRouterAbi.abi, provider);

  const nonce = await subaccountRouter.subaccountApprovalNonces(mainAccount);

  return nonce;
}

/**
 * Create a signature for subaccount approval
 * @param chainId Chain ID
 * @param mainAccountSigner Main account signer object (must have private key access)
 * @param subaccountAddress Subaccount address
 * @param params Optional configuration parameters
 * @returns SubaccountApproval object with signature
 */
export async function createSubaccountApproval(
  chainId: number,
  mainAccountSigner: Signer,
  subaccountAddress: string,
  params: {
    shouldAdd?: boolean;
    expiresAt?: bigint;
    maxAllowedCount?: bigint;
    actionType?: string;
    deadline?: bigint;
  } = {}
): Promise<SubaccountApproval> {
  // Get main account address
  const mainAccount = await mainAccountSigner.getAddress();
  console.log(`Creating subaccount approval from ${mainAccount} for subaccount ${subaccountAddress}`);

  // Set default values for optional parameters
  const shouldAdd = params.shouldAdd ?? true;
  const expiresAt = params.expiresAt ?? 9999999999n; // Far future
  const maxAllowedCount = params.maxAllowedCount ?? 0n; // 0 means no limit
  const actionType = params.actionType ?? SUBACCOUNT_ORDER_ACTION; // Default action type
  const deadline = params.deadline ?? BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

  // Get the current nonce from the contract
  const nonce = await getSubaccountApprovalNonce(chainId, mainAccount, mainAccountSigner.provider!);

  // Get the router contract address (needed for domain separator)
  const routerAddress = getContract(chainId, "SubaccountGelatoRelayRouter");

  // Define the EIP-712 types for subaccount approval
  const types = {
    SubaccountApproval: [
      { name: "subaccount", type: "address" },
      { name: "shouldAdd", type: "bool" },
      { name: "expiresAt", type: "uint256" },
      { name: "maxAllowedCount", type: "uint256" },
      { name: "actionType", type: "bytes32" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  // Create domain separator
  const domain = getGelatoRelayRouterDomain(chainId, routerAddress);

  // Create the typed data object
  const typedData = {
    subaccount: subaccountAddress,
    shouldAdd,
    expiresAt,
    maxAllowedCount,
    actionType,
    nonce,
    deadline,
  };

  console.log("Creating subaccount approval signature with:", {
    signerAddress: await mainAccountSigner.getAddress(),
    domain,
    types,
    typedData: typedData,
  });

  // Sign the typed data
  const signature = await mainAccountSigner.signTypedData(domain, types, typedData);

  // Return the full SubaccountApproval object
  return {
    subaccount: subaccountAddress,
    shouldAdd,
    expiresAt,
    maxAllowedCount,
    actionType,
    nonce,
    deadline,
    signature,
  };
}
