import type { PositionsConstants } from "domain/synthetics/positions/usePositionsConstants";
import { expandDecimals } from "lib/numbers";
import type { GasLimitsConfig } from "sdk/utils/fees/types";

/** Chain-level fixtures close to Arbitrum production values. */

export const MOCK_GAS_PRICE = 100000000n; // 0.1 gwei

export const MOCK_GAS_LIMITS: GasLimitsConfig = {
  depositToken: 1500000n,
  withdrawalMultiToken: 1500000n,
  shift: 1500000n,
  singleSwap: 1000000n,
  swapOrder: 3000000n,
  increaseOrder: 4000000n,
  decreaseOrder: 4000000n,
  estimatedGasFeeBaseAmount: 600000n,
  estimatedGasFeePerOraclePrice: 250000n,
  estimatedFeeMultiplierFactor: expandDecimals(1, 30),
  gelatoRelayFeeMultiplierFactor: expandDecimals(1, 30),
  glvDepositGasLimit: 2000000n,
  glvWithdrawalGasLimit: 2000000n,
  glvPerMarketGasLimit: 100000n,
  createOrderGasLimit: 700000n,
  updateOrderGasLimit: 700000n,
  cancelOrderGasLimit: 700000n,
  tokenPermitGasLimit: 110000n,
  gmxAccountCollateralGasLimit: 500000n,
};

export const MOCK_POSITIONS_CONSTANTS: PositionsConstants = {
  minCollateralUsd: expandDecimals(1, 30),
  minPositionSizeUsd: expandDecimals(1, 30),
  maxAutoCancelOrders: 6n,
  claimableCollateralDelay: 0n,
  claimableCollateralReductionFactor: 0n,
  claimableCollateralTimeDivisor: 1n,
};
