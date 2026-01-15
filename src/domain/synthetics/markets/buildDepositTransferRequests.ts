import type { ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import { getTransferRequests } from "domain/multichain/getTransferRequests";
import type { TransferRequests } from "domain/multichain/types";
import type { GmPaySource } from "domain/synthetics/markets";
import { applySlippageToMinOut } from "sdk/utils/trade";

import type { TechnicalGmFees } from "./technicalFees/technical-fees-types";

export function buildDepositTransferRequests({
  isDeposit,
  isGlv,
  chainId,
  paySource,
  isMarketTokenDeposit,
  marketTokenAddress,
  marketTokenAmount,
  longTokenAmount,
  shortTokenAmount,
  initialLongTokenAddress,
  initialShortTokenAddress,
  technicalFees,
}: {
  isDeposit: boolean;
  isGlv: boolean;
  chainId: ContractsChainId;
  paySource: GmPaySource;
  isMarketTokenDeposit: boolean;
  marketTokenAddress: string | undefined;
  marketTokenAmount: bigint;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  initialLongTokenAddress: string | undefined;
  initialShortTokenAddress: string | undefined;
  /**
   * Used for source chain deposit to adjust the transfer amount
   */
  technicalFees: TechnicalGmFees | undefined;
}): TransferRequests | undefined {
  if (!isDeposit) {
    return undefined;
  }

  const vaultAddress = isGlv ? getContract(chainId, "GlvVault") : getContract(chainId, "DepositVault");

  if (isMarketTokenDeposit) {
    return getTransferRequests([
      {
        to: vaultAddress,
        token: marketTokenAddress,
        amount: marketTokenAmount,
      },
    ]);
  }

  if (paySource === "sourceChain") {
    let tokenAddress =
      longTokenAmount !== undefined && longTokenAmount > 0n ? initialLongTokenAddress : initialShortTokenAddress;

    let amount = longTokenAmount !== undefined && longTokenAmount > 0n ? longTokenAmount : shortTokenAmount!;

    const estimatedReceivedAmount =
      technicalFees?.kind === "sourceChain" && technicalFees.isDeposit
        ? technicalFees.fees.txnEstimatedReceivedAmount
        : undefined;

    if (estimatedReceivedAmount !== undefined && estimatedReceivedAmount > amount) {
      return undefined;
    }

    amount = applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, estimatedReceivedAmount ?? amount);

    return getTransferRequests([{ to: vaultAddress, token: tokenAddress, amount }]);
  }

  return getTransferRequests([
    {
      to: vaultAddress,
      token: initialLongTokenAddress,
      amount: longTokenAmount,
    },
    {
      to: vaultAddress,
      token: initialShortTokenAddress,
      amount: shortTokenAmount,
    },
  ]);
}
