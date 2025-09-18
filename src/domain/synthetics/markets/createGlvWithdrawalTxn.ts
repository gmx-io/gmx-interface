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
import type { CreateGlvWithdrawalParamsStruct } from "./types";

type CreateGlvWithdrawalParams = {
  chainId: ContractsChainId;
  signer: WalletSigner;
  executionGasLimit: bigint;
  skipSimulation?: boolean;
  tokensData: TokensData;
  metricId?: OrderMetricId;
  blockTimestampData: BlockTimestampData | undefined;
  params: CreateGlvWithdrawalParamsStruct;
  glvTokenAmount: bigint;
  setPendingTxns: (txns: any) => void;
  setPendingWithdrawal: SetPendingWithdrawal;
};

export async function createGlvWithdrawalTxn(p: CreateGlvWithdrawalParams) {
  const contract = new ethers.Contract(getContract(p.chainId, "GlvRouter"), abis.GlvRouter, p.signer);
  const withdrawalVaultAddress = getContract(p.chainId, "GlvVault");

  const wntAmount = p.params.executionFee;

  await validateSignerAddress(p.signer, p.params.addresses.receiver);

  // TODO MLTCH: do not forget to apply slippage elsewhere
  // const minLongTokenAmount = applySlippageToMinOut(p.allowedSlippage, p.minLongTokenAmount);
  // const minShortTokenAmount = applySlippageToMinOut(p.allowedSlippage, p.minShortTokenAmount);

  const multicall = [
    { method: "sendWnt", params: [withdrawalVaultAddress, wntAmount] },
    { method: "sendTokens", params: [p.params.addresses.glv, withdrawalVaultAddress, p.glvTokenAmount] },
    {
      method: "createGlvWithdrawal",
      params: [
        {
          addresses: {
            receiver: p.params.addresses.receiver,
            callbackContract: ethers.ZeroAddress,
            uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.ZeroAddress,
            market: p.params.addresses.market,
            glv: p.params.addresses.glv,
            longTokenSwapPath: p.params.addresses.longTokenSwapPath,
            shortTokenSwapPath: p.params.addresses.shortTokenSwapPath,
          },
          minLongTokenAmount: p.params.minLongTokenAmount,
          minShortTokenAmount: p.params.minShortTokenAmount,
          shouldUnwrapNativeToken: p.params.shouldUnwrapNativeToken,
          executionFee: p.params.executionFee,
          callbackGasLimit: 0n,
          dataList: [],
        } satisfies IGlvWithdrawalUtils.CreateGlvWithdrawalParamsStruct,
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
        method: "simulateExecuteLatestGlvWithdrawal",
        errorTitle: t`Withdrawal error.`,
        value: wntAmount,
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
    wntAmount,
    simulationPromise,
    p.metricId
  );

  return callContract(p.chainId, contract, "multicall", [encodedPayload], {
    value: wntAmount,
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
      marketAddress: p.params.addresses.glv,
      marketTokenAmount: p.glvTokenAmount,
      minLongTokenAmount: p.params.minLongTokenAmount,
      minShortTokenAmount: p.params.minShortTokenAmount,
      shouldUnwrapNativeToken: p.params.shouldUnwrapNativeToken,
    });
  });
}
