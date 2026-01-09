import { t } from "@lingui/macro";
import { ethers } from "ethers";

import { getContract } from "config/contracts";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { SetPendingWithdrawal } from "context/SyntheticsEvents";
import { callContract } from "lib/contracts";
import { OrderMetricId } from "lib/metrics";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";
import { IGlvWithdrawalUtils } from "typechain-types/GlvRouter";

import { validateSignerAddress } from "components/Errors/errorToasts";

import { SwapPricingType } from "../orders";
import { prepareOrderTxn } from "../orders/prepareOrderTxn";
import { simulateExecuteTxn } from "../orders/simulateExecuteTxn";
import type { TokensData } from "../tokens";
import type { CreateGlvWithdrawalParams } from "./types";

export async function createGlvWithdrawalTxn({
  chainId,
  signer,
  executionGasLimit,
  skipSimulation,
  tokensData,
  metricId,
  blockTimestampData,
  params,
  glvTokenAmount,
  setPendingTxns,
  setPendingWithdrawal,
}: {
  chainId: ContractsChainId;
  signer: WalletSigner;
  executionGasLimit: bigint;
  skipSimulation?: boolean;
  tokensData: TokensData;
  metricId?: OrderMetricId;
  blockTimestampData: BlockTimestampData | undefined;
  params: CreateGlvWithdrawalParams;
  glvTokenAmount: bigint;
  setPendingTxns: (txns: any) => void;
  setPendingWithdrawal: SetPendingWithdrawal;
}) {
  const contract = new ethers.Contract(getContract(chainId, "GlvRouter"), abis.GlvRouter, signer);
  const withdrawalVaultAddress = getContract(chainId, "GlvVault");

  const wntAmount = params.executionFee;

  await validateSignerAddress(signer, params.addresses.receiver);

  const multicall = [
    { method: "sendWnt", params: [withdrawalVaultAddress, wntAmount] },
    { method: "sendTokens", params: [params.addresses.glv, withdrawalVaultAddress, glvTokenAmount] },
    {
      method: "createGlvWithdrawal",
      params: [
        {
          addresses: {
            receiver: params.addresses.receiver,
            callbackContract: ethers.ZeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.ZeroAddress,
            market: params.addresses.market,
            glv: params.addresses.glv,
            longTokenSwapPath: params.addresses.longTokenSwapPath,
            shortTokenSwapPath: params.addresses.shortTokenSwapPath,
          },
          minLongTokenAmount: params.minLongTokenAmount,
          minShortTokenAmount: params.minShortTokenAmount,
          shouldUnwrapNativeToken: params.shouldUnwrapNativeToken,
          executionFee: params.executionFee,
          callbackGasLimit: 0n,
          dataList: [],
        } satisfies IGlvWithdrawalUtils.CreateGlvWithdrawalParamsStruct,
      ],
    },
  ];

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => contract.interface.encodeFunctionData(call.method, call.params));

  const simulationPromise = !skipSimulation
    ? simulateExecuteTxn(chainId, {
        account: params.addresses.receiver,
        primaryPriceOverrides: {},
        tokensData: tokensData,
        createMulticallPayload: encodedPayload,
        method: "simulateExecuteLatestGlvWithdrawal",
        errorTitle: t`Withdrawal error.`,
        value: wntAmount,
        swapPricingType: SwapPricingType.Swap,
        metricId: metricId,
        blockTimestampData: blockTimestampData,
      })
    : undefined;

  const { gasLimit, gasPriceData } = await prepareOrderTxn(
    chainId,
    contract,
    "multicall",
    [encodedPayload],
    wntAmount,
    simulationPromise,
    metricId
  );

  return callContract(chainId, contract, "multicall", [encodedPayload], {
    value: wntAmount,
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
      marketAddress: params.addresses.glv,
      marketTokenAmount: glvTokenAmount,
      minLongTokenAmount: params.minLongTokenAmount,
      minShortTokenAmount: params.minShortTokenAmount,
      shouldUnwrapNativeToken: params.shouldUnwrapNativeToken,
    });
  });
}
