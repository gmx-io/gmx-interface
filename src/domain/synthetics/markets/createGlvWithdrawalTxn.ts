import { t } from "@lingui/macro";
import GlvRouter from "abis/GlvRouter.json";
import { getContract } from "config/contracts";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { isAddressZero } from "lib/legacy";
import { SwapPricingType } from "../orders";
import { simulateExecuteTxn } from "../orders/simulateExecuteTxn";
import { applySlippageToMinOut } from "../trade";
import { CreateWithdrawalParams } from "./createWithdrawalTxn";
import { prepareOrderTxn } from "../orders/prepareOrderTxn";

interface GlvWithdrawalParams extends Omit<CreateWithdrawalParams, "marketTokenAmount" | "marketTokenAddress"> {
  glv: string;
  selectedGmMarket: string;
  glvTokenAmount: bigint;
  glvTokenAddress: string;
}

export async function createGlvWithdrawalTxn(chainId: number, signer: Signer, p: GlvWithdrawalParams) {
  const contract = new ethers.Contract(getContract(chainId, "GlvRouter"), GlvRouter.abi, signer);
  const withdrawalVaultAddress = getContract(chainId, "GlvVault");

  const isNativeWithdrawal = isAddressZero(p.initialLongTokenAddress) || isAddressZero(p.initialShortTokenAddress);

  const wntAmount = p.executionFee;

  const minLongTokenAmount = applySlippageToMinOut(p.allowedSlippage, p.minLongTokenAmount);
  const minShortTokenAmount = applySlippageToMinOut(p.allowedSlippage, p.minShortTokenAmount);

  const multicall = [
    { method: "sendWnt", params: [withdrawalVaultAddress, wntAmount] },
    { method: "sendTokens", params: [p.glvTokenAddress, withdrawalVaultAddress, p.glvTokenAmount] },
    {
      method: "createGlvWithdrawal",
      params: [
        {
          receiver: p.account,
          callbackContract: ethers.ZeroAddress,
          uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.ZeroAddress,
          market: p.selectedGmMarket,
          glv: p.glv,
          longTokenSwapPath: p.longTokenSwapPath,
          shortTokenSwapPath: p.shortTokenSwapPath,
          minLongTokenAmount,
          minShortTokenAmount,
          shouldUnwrapNativeToken: isNativeWithdrawal,
          executionFee: p.executionFee,
          callbackGasLimit: 0n,
        },
      ],
    },
  ];

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => contract.interface.encodeFunctionData(call!.method, call!.params));

  const simulationPromise = !p.skipSimulation
    ? simulateExecuteTxn(chainId, {
        account: p.account,
        primaryPriceOverrides: {},
        tokensData: p.tokensData,
        createMulticallPayload: encodedPayload,
        method: "simulateExecuteGlvWithdrawal",
        errorTitle: t`Withdrawal error.`,
        value: wntAmount,
        swapPricingType: SwapPricingType.TwoStep,
        metricId: p.metricId,
      })
    : undefined;

  const { gasLimit, gasPriceData } = await prepareOrderTxn(
    chainId,
    contract,
    "multicall",
    [encodedPayload],
    wntAmount,
    undefined,
    simulationPromise,
    p.metricId
  );

  return callContract(chainId, contract, "multicall", [encodedPayload], {
    value: wntAmount,
    hideSentMsg: true,
    hideSuccessMsg: true,
    metricId: p.metricId,
    gasLimit,
    gasPriceData,
    setPendingTxns: p.setPendingTxns,
  }).then(() => {
    p.setPendingWithdrawal({
      account: p.account,
      marketAddress: p.glv,
      marketTokenAmount: p.glvTokenAmount,
      minLongTokenAmount,
      minShortTokenAmount,
      shouldUnwrapNativeToken: isNativeWithdrawal,
    });
  });
}
