import { BaseContract, Contract } from "ethers";
import { isAddress, isHex } from "viem";

import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";

/**
 * @deprecated use estimateGasLimit instead
 */
export async function getGasLimit({
  chainId,
  contract,
  method,
  params = [],
  value,
  from,
}: {
  chainId: number;
  contract: Contract | BaseContract;
  method: string;
  params?: any[];
  value?: bigint | number;
  from?: string;
}): Promise<bigint> {
  const publicClient = getPublicClientWithRpc(chainId);
  const to = await contract.getAddress();
  const data = contract.interface.encodeFunctionData(method, params);
  if (!from || !isAddress(from) || !isAddress(to) || !isHex(data)) {
    throw new Error("Invalid gas estimation parameters");
  }

  const gasLimit = await publicClient.estimateGas({
    account: from,
    to,
    data,
    value: value !== undefined ? BigInt(value) : undefined,
  });
  return applyGasLimitBuffer(gasLimit);
}
