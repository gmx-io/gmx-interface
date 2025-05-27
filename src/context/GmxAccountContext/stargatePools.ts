import { Chain, EndpointId, EndpointVersion, Stage, chainAndStageToEndpointId } from "@layerzerolabs/lz-definitions";
import { errors as _StargateErrorsAbi } from "@stargatefinance/stg-evm-sdk-v2";
import { abi as IStargateAbi } from "@stargatefinance/stg-evm-sdk-v2/artifacts/src/interfaces/IStargate.sol/IStargate.json";
import { address as ethPoolArbitrumSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/arbsep-testnet/StargatePoolNative.json";
import { address as usdcSgPoolArbitrumSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/arbsep-testnet/StargatePoolUSDC.json";
import { address as ethPoolOptimismSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/optsep-testnet/StargatePoolNative.json";
import { address as usdcSgPoolOptimismSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/optsep-testnet/StargatePoolUSDC.json";
import { address as ethPoolSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/sepolia-testnet/StargatePoolNative.json";
import { address as usdcSgPoolSepolia } from "@stargatefinance/stg-evm-sdk-v2/deployments/sepolia-testnet/StargatePoolUSDC.json";
import type { JsonFragment } from "ethers";
import invert from "lodash/invert";
import mapValues from "lodash/mapValues";
import type { Abi } from "viem";

import { ARBITRUM_SEPOLIA, OPTIMISM_SEPOLIA, SEPOLIA, UiSettlementChain, UiSourceChain } from "config/chains";

export {
  IStargateAbi,
  ethPoolArbitrumSepolia,
  ethPoolOptimismSepolia,
  ethPoolSepolia,
  usdcSgPoolArbitrumSepolia,
  usdcSgPoolOptimismSepolia,
  usdcSgPoolSepolia,
};

export const StargateErrorsAbi = _StargateErrorsAbi as readonly (Abi[number] & JsonFragment)[];

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
export const SEPOLIA_STARGATE_ENDPOINT_ID = chainAndStageToEndpointId(Chain.SEPOLIA, Stage.TESTNET, EndpointVersion.V2);

export const CHAIN_ID_TO_ENDPOINT_ID: Record<UiSettlementChain | UiSourceChain, EndpointId> = {
  [ARBITRUM_SEPOLIA]: ARBITRUM_SEPOLIA_STARGATE_ENDPOINT_ID,
  [OPTIMISM_SEPOLIA]: OPTIMISM_SEPOLIA_STARGATE_ENDPOINT_ID,
  [SEPOLIA]: SEPOLIA_STARGATE_ENDPOINT_ID,
};

export const ENDPOINT_ID_TO_CHAIN_ID: Partial<Record<EndpointId, UiSettlementChain | UiSourceChain>> = mapValues(
  invert(CHAIN_ID_TO_ENDPOINT_ID),
  (value) => parseInt(value)
);
