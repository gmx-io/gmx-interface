import { Chain, EndpointId, EndpointVersion, Stage, chainAndStageToEndpointId } from "@layerzerolabs/lz-definitions";
import { address as usdcSgPoolArbitrumSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/arbsep-testnet/StargatePoolUSDC.json";
import { address as usdcSgPoolOptimismSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/optsep-testnet/StargatePoolUSDC.json";

export { usdcSgPoolArbitrumSepolia, usdcSgPoolOptimismSepolia };

import { ARBITRUM_SEPOLIA, OPTIMISM_SEPOLIA, UiSettlementChain, UiSourceChain } from "config/chains";

export const ARBITRUM_SEPOLIA_STARGATE_ENDPOINT_ID = chainAndStageToEndpointId(
  Chain.ARBSEP,
  Stage.TESTNET,
  EndpointVersion.V2
);
export const OPTIMISM_SEPOLIA_STARGATE_ENDPOINT_ID = chainAndStageToEndpointId(
  Chain.OPTSEP,
  Stage.TESTNET,
  EndpointVersion.V2
);

export const CHAIN_ID_TO_ENDPOINT_ID: Record<UiSettlementChain | UiSourceChain, EndpointId> = {
  [ARBITRUM_SEPOLIA]: ARBITRUM_SEPOLIA_STARGATE_ENDPOINT_ID,
  [OPTIMISM_SEPOLIA]: OPTIMISM_SEPOLIA_STARGATE_ENDPOINT_ID,
};
