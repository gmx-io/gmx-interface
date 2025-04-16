import { Contract, Signer, ethers } from "ethers";

import { ARBITRUM, AVALANCHE, getChainName } from "config/chains";
import { getProvider } from "lib/rpc";
import { sleep } from "lib/sleep";
import ERC20PermitInterfaceAbi from "sdk/abis/ERC20PermitInterface.json";
import { getTokens } from "sdk/configs/tokens";
import { SignedTokenPermit } from "sdk/types/tokens";

import { signTypedData, splitSignature } from "./signing";

export async function createAndSignTokenPermit(
  chainId: number,
  signer: Signer,
  token: string,
  spender: string,
  value: bigint,
  deadline: bigint
): Promise<SignedTokenPermit> {
  const owner = await signer.getAddress();

  if (!signer.provider) {
    throw new Error("Signer must be connected to a provider");
  }

  // TODO: to static script
  const supportsPerm = await supportsPermit(token, signer.provider);
  if (!supportsPerm) {
    throw new Error(`Token ${token} does not support EIP-2612 permits`);
  }

  const tokenContract = new Contract(token, ERC20PermitInterfaceAbi.abi, signer);

  // TODO: multicall
  const [name, version, nonce] = await Promise.all([
    tokenContract.name(),
    tokenContract.version(),
    tokenContract.nonces(owner),
  ]);

  const domain = {
    name,
    version,
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

  const permitData = {
    owner,
    spender,
    value,
    nonce,
    deadline,
  };

  const signature = await signTypedData(signer, domain, types, permitData);

  const { r, s, v } = splitSignature(signature);

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

export async function supportsPermit(token: string, provider: ethers.Provider): Promise<boolean> {
  try {
    const contract = new ethers.Contract(token, ERC20PermitInterfaceAbi.abi, provider);

    await Promise.all([contract.DOMAIN_SEPARATOR(), contract.nonces(ethers.ZeroAddress)]);

    return true;
  } catch (error) {
    return false;
  }
}

export async function checkSupportPermitTokens() {
  const chains = [ARBITRUM, AVALANCHE];

  for (const chain of chains) {
    const provider = getProvider(undefined, chain);
    const tokens = getTokens(chain);
    const supportedTokens: any[] = [];

    for (const token of tokens) {
      const supportsPerm = await supportsPermit(token.address, provider);
      await sleep(50);

      if (supportsPerm) {
        supportedTokens.push({
          symbol: token.symbol,
          address: token.address,
        });
      }
    }

    // TODO: TEMP DEBUG
    // eslint-disable-next-line no-console
    console.log(`Supported tokens on ${getChainName(chain)}:`, supportedTokens);
  }
}
