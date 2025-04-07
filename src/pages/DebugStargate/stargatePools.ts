import { address as usdcSgPoolArbitrumSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/arbsep-testnet/StargatePoolUSDC.json";
import { address as usdcSgPoolOptimismSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/optsep-testnet/StargatePoolUSDC.json";

import { ARBITRUM_SEPOLIA } from "config/chains";

export const OPTIMISM_SEPOLIA = 11155420;
export const USDC_SG_POOL_ADDRESSES = {
  [ARBITRUM_SEPOLIA]: usdcSgPoolArbitrumSepolia,
  [OPTIMISM_SEPOLIA]: usdcSgPoolOptimismSepolia,
};
