import { BaseContract, Contract } from "ethers";
import type { Address, Hex } from "viem";

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
  const gasLimit = await publicClient.estimateGas({
    account: from! as Address,
    to: to as Address,
    data: data as Hex,
    value: value !== undefined ? BigInt(value) : undefined,
  });
  return applyGasLimitBuffer(gasLimit);
}
