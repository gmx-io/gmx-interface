import { Address, Hex, PublicClient } from "viem";

import { NodeInterfaceAbi, NodeInterfaceAddress } from "./NodeInterface";

export async function estimateArbitrumL1Gas(
  client: PublicClient,
  to: Address,
  data: Hex,
  callParameters?: {
    blockNumber?: bigint;
  }
): Promise<bigint> {
  const {
    result: [gasEstimateForL1, baseFee, l1BaseFeeEstimate],
  } = await client.simulateContract({
    address: NodeInterfaceAddress,
    abi: NodeInterfaceAbi,
    functionName: "gasEstimateL1Component",
    args: [
      // to
      to,
      // contractCreation
      false,
      // data
      data,
    ],
    ...callParameters,
  });

  // Getting useful values for calculating the formula
  const parentChainGasEstimated = gasEstimateForL1;
  // const childChainGasUsed = gasEstimate - gasEstimateForL1;
  const childChainEstimatedPrice = baseFee;
  const parentChainEstimatedPrice = l1BaseFeeEstimate * 16n;

  // Calculating some extra values to be able to apply all variables of the formula
  // -------------------------------------------------------------------------------
  // NOTE: This one might be a bit confusing, but parentChainGasEstimated (B in the formula) is calculated based on child-chain's gas fees
  const parentChainCost = parentChainGasEstimated * childChainEstimatedPrice;
  const parentChainSize = parentChainCost / parentChainEstimatedPrice;

  // Getting the result of the formula
  // ---------------------------------
  // Setting the basic variables of the formula
  const P = childChainEstimatedPrice;
  // const L2G = childChainGasUsed;
  const L1P = parentChainEstimatedPrice;
  const L1S = parentChainSize;

  // L1C (L1 Cost) = L1P * L1S
  const L1C = L1P * L1S;

  // B (Extra Buffer) = L1C / P
  const B = L1C / P;

  // G (Gas Limit) = L2G + B
  // const G = L2G + B;

  // TXFEES (Transaction fees) = P * G
  // const TXFEES = P * G;

  return B;
}
