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
    let tokenAddress: string;
    let amount: bigint;

    if (initialLongTokenAddress === undefined || initialShortTokenAddress === undefined) {
      return undefined;
    }

    if (initialLongTokenAddress === initialShortTokenAddress) {
      tokenAddress = initialLongTokenAddress;
      amount = (longTokenAmount ?? 0n) + (shortTokenAmount ?? 0n);
    } else if (longTokenAmount !== undefined && longTokenAmount > 0n) {
      tokenAddress = initialLongTokenAddress;
      amount = longTokenAmount;
    } else if (shortTokenAmount !== undefined && shortTokenAmount > 0n) {
      tokenAddress = initialShortTokenAddress;
      amount = shortTokenAmount;
    } else {
      return undefined;
    }

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

  if (initialLongTokenAddress === initialShortTokenAddress) {
    return getTransferRequests([
      {
        to: vaultAddress,
        token: initialLongTokenAddress,
        amount: (longTokenAmount ?? 0n) + (shortTokenAmount ?? 0n),
      },
    ]);
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
