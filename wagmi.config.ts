import { defineConfig } from "@wagmi/cli";
import { blockExplorer } from "@wagmi/cli/plugins";

import { abis } from "./sdk/src/abis";
import { ARBITRUM_SEPOLIA } from "./sdk/src/configs/chains";
import { getContract } from "./sdk/src/configs/contracts";

export default defineConfig({
  out: "src/wagmi-generated.ts",
  contracts: [
    {
      name: "MultichainOrderRouter",
      abi: abis.MultichainOrderRouterArbitrumSepolia,
      address: {
        [ARBITRUM_SEPOLIA]: getContract(ARBITRUM_SEPOLIA, "MultichainOrderRouter"),
      },
    },
    {
      name: "MultichainSubaccountRouter",
      abi: abis.MultichainSubaccountRouterArbitrumSepolia,
      address: {
        [ARBITRUM_SEPOLIA]: getContract(ARBITRUM_SEPOLIA, "MultichainSubaccountRouter"),
      },
    },
    {
      name: "LayerZeroProvider",
      abi: abis.LayerZeroProviderArbitrumSepolia,
      address: {
        [ARBITRUM_SEPOLIA]: getContract(ARBITRUM_SEPOLIA, "LayerZeroProvider"),
      },
    },
    {
      name: "MultichainTransferRouter",
      abi: abis.MultichainTransferRouterArbitrumSepolia,
      address: {
        [ARBITRUM_SEPOLIA]: getContract(ARBITRUM_SEPOLIA, "MultichainTransferRouter"),
      },
    },
  ],
  plugins: [
    blockExplorer({
      baseUrl: "https://api-sepolia.arbiscan.io/api",
      contracts: [{ name: "SyntheticsReader", address: getContract(ARBITRUM_SEPOLIA, "SyntheticsReader") }],
      name: "Arbitrum Sepolia Arbiscan",
      chainId: ARBITRUM_SEPOLIA,
      apiKey: process.env.ARBISCAN_API_KEY,
    }),
  ],
});
