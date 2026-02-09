import { GasLimitsConfig } from "utils/fees/types";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, ARBITRUM_SEPOLIA, BOTANIX } from "./chainIds";
import { ContractsChainId } from "./chains";

export type StaticGasLimitsConfig = Pick<
  GasLimitsConfig,
  | "createOrderGasLimit"
  | "updateOrderGasLimit"
  | "cancelOrderGasLimit"
  | "tokenPermitGasLimit"
  | "gmxAccountCollateralGasLimit"
>;

export const GAS_LIMITS_STATIC_CONFIG: Record<ContractsChainId, StaticGasLimitsConfig> = {
  [ARBITRUM]: {
    createOrderGasLimit: 1000000n,
    updateOrderGasLimit: 800000n,
    cancelOrderGasLimit: 700000n,
    tokenPermitGasLimit: 90000n,
    gmxAccountCollateralGasLimit: 0n,
  },
  [AVALANCHE]: {
    createOrderGasLimit: 1000000n,
    updateOrderGasLimit: 800000n,
    cancelOrderGasLimit: 700000n,
    tokenPermitGasLimit: 90000n,
    gmxAccountCollateralGasLimit: 0n,
  },
  [AVALANCHE_FUJI]: {
    createOrderGasLimit: 1000000n,
    updateOrderGasLimit: 800000n,
    cancelOrderGasLimit: 700000n,
    tokenPermitGasLimit: 90000n,
    gmxAccountCollateralGasLimit: 0n,
  },
  [ARBITRUM_SEPOLIA]: {
    createOrderGasLimit: 1000000n,
    updateOrderGasLimit: 800000n,
    cancelOrderGasLimit: 1500000n,
    tokenPermitGasLimit: 90000n,
    gmxAccountCollateralGasLimit: 400000n,
  },
  [BOTANIX]: {
    createOrderGasLimit: 1000000n,
    updateOrderGasLimit: 800000n,
    cancelOrderGasLimit: 700000n,
    tokenPermitGasLimit: 90000n,
    gmxAccountCollateralGasLimit: 0n,
  },
};
