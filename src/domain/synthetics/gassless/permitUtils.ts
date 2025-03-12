import { Contract, Signer, ethers } from "ethers";
import { getContract } from "config/contracts";
import { signTypedData } from "./signing";

// Define the TokenPermit type to match the contract's structure
export type TokenPermit = {
  owner: string;
  spender: string;
  value: bigint;
  deadline: bigint;
  v: number;
  r: string;
  s: string;
  token: string;
};

/**
 * Debug EIP-2612 permit issues for a specific token
 * Checks support, token name, nonces, and domain separator
 *
 * @param token The token address to debug
 * @param signer The signer to use for testing
 * @param provider The provider to use for queries
 * @param chainId The chain ID
 * @returns True if all checks pass, false otherwise
 */
export async function debugPermitSignature(token: string, signer: Signer, provider: ethers.Provider, chainId: number) {
  // Check if the token supports permits
  const supportsEIP2612 = await supportsPermit(token, provider);
  if (!supportsEIP2612) {
    console.error(`Token ${token} does not support EIP-2612 permits!`);
    return false;
  }

  // Get token information
  try {
    const tokenContract = new ethers.Contract(
      token,
      [
        "function name() view returns (string)",
        "function DOMAIN_SEPARATOR() view returns (bytes32)",
        "function nonces(address owner) view returns (uint256)",
      ],
      provider
    );

    const owner = await signer.getAddress();

    // Check token name
    const tokenName = await tokenContract.name();
    console.log(`Token name: ${tokenName}`);

    // Check nonce
    const nonce = await tokenContract.nonces(owner);
    console.log(`Current nonce for ${owner}: ${nonce}`);

    // Check domain separator from contract
    const domainSeparator = await tokenContract.DOMAIN_SEPARATOR();
    console.log(`Contract domain separator: ${domainSeparator}`);

    // Calculate expected domain separator
    const domain = {
      name: tokenName,
      version: "2",
      chainId,
      verifyingContract: token,
    };
    console.log(`Our domain used for signing:`, domain);

    return true;
  } catch (error) {
    console.error("Error debugging permit:", error);
    return false;
  }
}

export async function createTokenPermit(
  signer: Signer,
  token: string,
  spender: string,
  value: bigint,
  deadline: bigint,
  chainId: number
): Promise<TokenPermit> {
  const owner = await signer.getAddress();

  if (!signer.provider) {
    throw new Error("Signer must be connected to a provider");
  }

  const supportsPerm = await supportsPermit(token, signer.provider);
  if (!supportsPerm) {
    throw new Error(`Token ${token} does not support EIP-2612 permits`);
  }

  // Get token information for domain
  const tokenContract = new PermitContract(token, signer);
  const name = await tokenContract.name();

  const domain = {
    name,
    version: "2",
    chainId,
    verifyingContract: token,
  };

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const nonce = await tokenContract.nonces(owner);

  // Create the permit data
  const permitData = {
    owner,
    spender,
    value,
    nonce,
    deadline,
  };

  const signature = await signer.signTypedData(domain, types, permitData);
  console.log(`Generated signature: ${signature}`);

  const { r, s, v } = splitSignature(signature);
  console.log(`Signature components: v=${v}, r=${r}, s=${s}`);

  return {
    owner,
    spender,
    value,
    deadline,
    v,
    r,
    s,
    token,
  };
}

/**
 * Helper function to create a permit for the collateral token
 * Uses the Router contract as the spender
 *
 * @param chainId The chain ID
 * @param signer The signer to sign the permit
 * @param collateralToken The collateral token address
 * @param amount The amount to approve
 * @param deadline The deadline timestamp for the permit
 * @returns A token permit for the collateral token
 */
export async function createCollateralTokenPermit(
  chainId: number,
  signer: Signer,
  collateralToken: string,
  amount: bigint,
  deadline = BigInt(Math.floor(Date.now() / 1000) + 3600) // 1 hour from now
): Promise<TokenPermit> {
  // Get the router address which will be the spender
  const routerAddress = getContract(chainId, "SyntheticsRouter");
  console.log(`Using router address as spender: ${routerAddress}`);

  return createTokenPermit(signer, collateralToken, routerAddress, ethers.MaxUint256, deadline, chainId);
}

/**
 * Helper function to create a permit for multiple tokens
 * Useful when dealing with multiple collateral tokens or fee tokens
 *
 * @param chainId The chain ID
 * @param signer The signer to sign the permit
 * @param tokens Map of token addresses to amounts
 * @param deadline The deadline timestamp for the permit
 * @returns Array of token permits
 */
export async function createMultiTokenPermits(
  chainId: number,
  signer: Signer,
  tokens: Map<string, bigint>,
  deadline = BigInt(Math.floor(Date.now() / 1000) + 3600) // 1 hour from now
): Promise<TokenPermit[]> {
  const permits: TokenPermit[] = [];

  for (const [tokenAddress, amount] of tokens.entries()) {
    const permit = await createCollateralTokenPermit(chainId, signer, tokenAddress, amount, deadline);

    permits.push(permit);
  }

  return permits;
}

// Helper to split the signature
function splitSignature(signature: string): { r: string; s: string; v: number } {
  const sig = signature.slice(2);
  const r = "0x" + sig.substring(0, 64);
  const s = "0x" + sig.substring(64, 128);
  const v = parseInt(sig.substring(128, 130), 16);

  return { r, s, v };
}

/**
 * Check if a token supports the EIP-2612 permit function
 * @param token The token address
 * @param provider The provider to use for the check
 * @returns True if the token supports permits, false otherwise
 */
export async function supportsPermit(token: string, provider: ethers.Provider): Promise<boolean> {
  try {
    const contract = new ethers.Contract(
      token,
      [
        "function DOMAIN_SEPARATOR() view returns (bytes32)",
        "function nonces(address owner) view returns (uint256)",
        "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)",
      ],
      provider
    );

    // Try to call the required functions to check if they exist
    await Promise.all([contract.DOMAIN_SEPARATOR(), contract.nonces(ethers.ZeroAddress)]);

    return true;
  } catch (error) {
    console.log(`Token ${token} does not support permit:`, error);
    return false;
  }
}

/**
 * Get the domain separator directly from a token contract
 * Useful for comparing with our calculated version
 *
 * @param token The token address
 * @param provider The provider to use
 * @returns The domain separator as hex string
 */
export async function getDomainSeparatorFromContract(token: string, provider: ethers.Provider): Promise<string> {
  const contract = new ethers.Contract(token, ["function DOMAIN_SEPARATOR() view returns (bytes32)"], provider);

  return await contract.DOMAIN_SEPARATOR();
}

// Define a minimal interface for ERC20 Permit tokens
class PermitContract {
  private address: string;
  private signer: Signer;

  constructor(address: string, signer: Signer) {
    this.address = address;
    this.signer = signer;
  }

  async name(): Promise<string> {
    // Create a contract instance to call the name() function
    const contract = new Contract(this.address, ["function name() view returns (string)"], this.signer);
    return await contract.name();
  }

  async nonces(owner: string): Promise<bigint> {
    // Create a contract instance to call the nonces() function
    const contract = new Contract(this.address, ["function nonces(address owner) view returns (uint256)"], this.signer);
    return await contract.nonces(owner);
  }

  async DOMAIN_SEPARATOR(): Promise<string> {
    // Create a contract instance to call the DOMAIN_SEPARATOR() function
    const contract = new Contract(this.address, ["function DOMAIN_SEPARATOR() view returns (bytes32)"], this.signer);
    return await contract.DOMAIN_SEPARATOR();
  }
}
