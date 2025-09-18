import { t } from "@lingui/macro";
import { Signer, ethers } from "ethers";

import { getContract } from "config/contracts";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import type { SetPendingWithdrawal } from "context/SyntheticsEvents";
import { callContract } from "lib/contracts";
import type { OrderMetricId } from "lib/metrics/types";
import type { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";

import { validateSignerAddress } from "components/Errors/errorToasts";

import { SwapPricingType } from "../orders";
import { prepareOrderTxn } from "../orders/prepareOrderTxn";
import { simulateExecuteTxn } from "../orders/simulateExecuteTxn";
import type { TokensData } from "../tokens";
import type { CreateWithdrawalParamsStruct } from "./types";

export type CreateWithdrawalParams = {
  chainId: ContractsChainId;
  signer: Signer;
  marketTokenAmount: bigint;
  executionGasLimit: bigint;
  skipSimulation?: boolean;
  tokensData: TokensData;
  metricId?: OrderMetricId;
  blockTimestampData: BlockTimestampData | undefined;
  params: CreateWithdrawalParamsStruct;
  setPendingTxns: (txns: any) => void;
  setPendingWithdrawal: SetPendingWithdrawal;
};

export async function createWithdrawalTxn(p: CreateWithdrawalParams) {
  const contract = new ethers.Contract(getContract(p.chainId, "ExchangeRouter"), abis.ExchangeRouter, p.signer);
  const withdrawalVaultAddress = getContract(p.chainId, "WithdrawalVault");

  await validateSignerAddress(p.signer, p.params.addresses.receiver);

  // const wntAmount = p.params.executionFee;

  // TODO MLTCH: do not forget to apply slippage elsewhere
  // const minLongTokenAmount = applySlippageToMinOut(p.allowedSlippage, p.params.minLongTokenAmount);
  // const minShortTokenAmount = applySlippageToMinOut(p.allowedSlippage, p.params.minShortTokenAmount);

  const multicall = [
    { method: "sendWnt", params: [withdrawalVaultAddress, p.params.executionFee] },
    { method: "sendTokens", params: [p.params.addresses.market, withdrawalVaultAddress, p.marketTokenAmount] },
    {
      method: "createWithdrawal",
      params: [
        {
          addresses: {
            receiver: p.params.addresses.receiver,
            callbackContract: ethers.ZeroAddress,
            market: p.params.addresses.market,
            longTokenSwapPath: p.params.addresses.longTokenSwapPath,
            shortTokenSwapPath: p.params.addresses.shortTokenSwapPath,
            uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.ZeroAddress,
          },
          minLongTokenAmount: p.params.minLongTokenAmount,
          minShortTokenAmount: p.params.minShortTokenAmount,
          shouldUnwrapNativeToken: p.params.shouldUnwrapNativeToken,
          executionFee: p.params.executionFee,
          callbackGasLimit: 0n,
          dataList: [],
        } satisfies CreateWithdrawalParamsStruct,
      ],
    },
  ];

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => contract.interface.encodeFunctionData(call!.method, call!.params));

  const simulationPromise = !p.skipSimulation
    ? simulateExecuteTxn(p.chainId, {
        account: p.params.addresses.receiver,
        primaryPriceOverrides: {},
        tokensData: p.tokensData,
        createMulticallPayload: encodedPayload,
        method: "simulateExecuteLatestWithdrawal",
        errorTitle: t`Withdrawal error.`,
        value: p.params.executionFee,
        swapPricingType: SwapPricingType.TwoStep,
        metricId: p.metricId,
        blockTimestampData: p.blockTimestampData,
      })
    : undefined;

  const { gasLimit, gasPriceData } = await prepareOrderTxn(
    p.chainId,
    contract,
    "multicall",
    [encodedPayload],
    p.params.executionFee,
    simulationPromise,
    p.metricId
  );

  return callContract(p.chainId, contract, "multicall", [encodedPayload], {
    value: p.params.executionFee,
    hideSentMsg: true,
    hideSuccessMsg: true,
    metricId: p.metricId,
    gasLimit,
    gasPriceData,
    setPendingTxns: p.setPendingTxns,
    pendingTransactionData: {
      estimatedExecutionFee: p.params.executionFee,
      estimatedExecutionGasLimit: p.executionGasLimit,
    },
  }).then(() => {
    p.setPendingWithdrawal({
      account: p.params.addresses.receiver,
      marketAddress: p.params.addresses.market,
      marketTokenAmount: p.marketTokenAmount,
      minLongTokenAmount: p.params.minLongTokenAmount,
      minShortTokenAmount: p.params.minShortTokenAmount,
      shouldUnwrapNativeToken: p.params.shouldUnwrapNativeToken,
    });
  });
}
