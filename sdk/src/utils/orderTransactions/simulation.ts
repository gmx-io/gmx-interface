import { encodeFunctionData } from "viem";

import { abis } from "abis";

export function encodeSimulationRouterExternalCall(simulationRouterAddress: string, simulateExecuteData: string) {
  return encodeFunctionData({
    abi: abis.ExchangeRouter,
    functionName: "makeExternalCalls",
    args: [[simulationRouterAddress], [simulateExecuteData], [], []],
  });
}
