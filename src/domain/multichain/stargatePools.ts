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

import { LayerZeroEndpointId } from "./types";

export {
  ethPoolArbitrumSepolia,
  ethPoolOptimismSepolia,
  ethPoolSepolia,
  IStargateAbi,
  usdcSgPoolArbitrumSepolia,
  usdcSgPoolOptimismSepolia,
  usdcSgPoolSepolia,
};

export const StargateErrorsAbi = _StargateErrorsAbi as readonly (Abi[number] & JsonFragment)[];

export const CHAIN_ID_TO_ENDPOINT_ID: Record<UiSettlementChain | UiSourceChain, LayerZeroEndpointId> = {
  [ARBITRUM_SEPOLIA]: 40231,
  [SEPOLIA]: 40161,
  [OPTIMISM_SEPOLIA]: 40232,
};

export const ENDPOINT_ID_TO_CHAIN_ID: Partial<Record<LayerZeroEndpointId, UiSettlementChain | UiSourceChain>> =
  mapValues(invert(CHAIN_ID_TO_ENDPOINT_ID), (value) => parseInt(value));
