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
import type { CreateWithdrawalParams } from "./types";

export async function createWithdrawalTxn({
  chainId,
  signer,
  marketTokenAmount,
  executionGasLimit,
  skipSimulation,
  tokensData,
  metricId,
  blockTimestampData,
  params,
  setPendingTxns,
  setPendingWithdrawal,
}: {
  chainId: ContractsChainId;
  signer: Signer;
  marketTokenAmount: bigint;
  executionGasLimit: bigint;
  skipSimulation?: boolean;
  tokensData: TokensData;
  metricId?: OrderMetricId;
  blockTimestampData: BlockTimestampData | undefined;
  params: CreateWithdrawalParams;
  setPendingTxns: (txns: any) => void;
  setPendingWithdrawal: SetPendingWithdrawal;
}) {
  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);
  const withdrawalVaultAddress = getContract(chainId, "WithdrawalVault");

  await validateSignerAddress(signer, params.addresses.receiver);

  // const wntAmount = p.params.executionFee;

  // TODO MLTCH: do not forget to apply slippage elsewhere
  // const minLongTokenAmount = applySlippageToMinOut(p.allowedSlippage, p.params.minLongTokenAmount);
  // const minShortTokenAmount = applySlippageToMinOut(p.allowedSlippage, p.params.minShortTokenAmount);

  const multicall = [
    { method: "sendWnt", params: [withdrawalVaultAddress, params.executionFee] },
    { method: "sendTokens", params: [params.addresses.market, withdrawalVaultAddress, marketTokenAmount] },
    {
      method: "createWithdrawal",
      params: [
        {
          addresses: {
            receiver: params.addresses.receiver,
            callbackContract: ethers.ZeroAddress,
            market: params.addresses.market,
            longTokenSwapPath: params.addresses.longTokenSwapPath,
            shortTokenSwapPath: params.addresses.shortTokenSwapPath,
            uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.ZeroAddress,
          },
          minLongTokenAmount: params.minLongTokenAmount,
          minShortTokenAmount: params.minShortTokenAmount,
          shouldUnwrapNativeToken: params.shouldUnwrapNativeToken,
          executionFee: params.executionFee,
          callbackGasLimit: 0n,
          dataList: [],
        } satisfies CreateWithdrawalParams,
      ],
    },
  ];

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => contract.interface.encodeFunctionData(call!.method, call!.params));

  const simulationPromise = !skipSimulation
    ? simulateExecuteTxn(chainId, {
        account: params.addresses.receiver,
        primaryPriceOverrides: {},
        tokensData: tokensData,
        createMulticallPayload: encodedPayload,
        method: "simulateExecuteLatestWithdrawal",
        errorTitle: t`Withdrawal error.`,
        value: params.executionFee,
        swapPricingType: SwapPricingType.TwoStep,
        metricId: metricId,
        blockTimestampData: blockTimestampData,
      })
    : undefined;

  const { gasLimit, gasPriceData } = await prepareOrderTxn(
    chainId,
    contract,
    "multicall",
    [encodedPayload],
    params.executionFee,
    simulationPromise,
    metricId
  );

  return callContract(chainId, contract, "multicall", [encodedPayload], {
    value: params.executionFee,
    hideSentMsg: true,
    hideSuccessMsg: true,
    metricId: metricId,
    gasLimit,
    gasPriceData,
    setPendingTxns: setPendingTxns,
    pendingTransactionData: {
      estimatedExecutionFee: params.executionFee,
      estimatedExecutionGasLimit: executionGasLimit,
    },
  }).then(() => {
    setPendingWithdrawal({
      account: params.addresses.receiver,
      marketAddress: params.addresses.market,
      marketTokenAmount: marketTokenAmount,
      minLongTokenAmount: params.minLongTokenAmount,
      minShortTokenAmount: params.minShortTokenAmount,
      shouldUnwrapNativeToken: params.shouldUnwrapNativeToken,
    });
  });
}
