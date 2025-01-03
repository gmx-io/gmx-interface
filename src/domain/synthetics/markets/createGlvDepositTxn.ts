import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "sdk/configs/tokens";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { simulateExecuteTxn } from "../orders/simulateExecuteTxn";
import { applySlippageToMinOut } from "../trade";

import GlvRouter from "sdk/abis/GlvRouter.json";
import { prepareOrderTxn } from "../orders/prepareOrderTxn";
import { CreateDepositParams } from "./createDepositTxn";

interface CreateGlvDepositParams extends CreateDepositParams {
  glvAddress: string;
  marketTokenAmount: bigint;
  isMarketTokenDeposit: boolean;
}

export async function createGlvDepositTxn(chainId: number, signer: Signer, p: CreateGlvDepositParams) {
  const contract = new ethers.Contract(getContract(chainId, "GlvRouter"), GlvRouter.abi, signer);
  const depositVaultAddress = getContract(chainId, "GlvVault");

  const isNativeLongDeposit = Boolean(
    p.initialLongTokenAddress === NATIVE_TOKEN_ADDRESS && p.longTokenAmount != undefined && p.longTokenAmount > 0
  );
  const isNativeShortDeposit = Boolean(
    p.initialShortTokenAddress === NATIVE_TOKEN_ADDRESS && p.shortTokenAmount != undefined && p.shortTokenAmount > 0
  );

  let wntDeposit = 0n;

  if (isNativeLongDeposit) {
    wntDeposit = wntDeposit + p.longTokenAmount!;
  }

  if (isNativeShortDeposit) {
    wntDeposit = wntDeposit + p.shortTokenAmount!;
  }

  const shouldUnwrapNativeToken = isNativeLongDeposit || isNativeShortDeposit;

  const wntAmount = p.executionFee + wntDeposit;

  const initialLongTokenAddress = convertTokenAddress(chainId, p.initialLongTokenAddress, "wrapped");
  const initialShortTokenAddress = convertTokenAddress(chainId, p.initialShortTokenAddress, "wrapped");

  const minGlvTokens = applySlippageToMinOut(p.allowedSlippage, p.minMarketTokens);

  const multicall = [
    { method: "sendWnt", params: [depositVaultAddress, wntAmount] },
    !isNativeLongDeposit && p.longTokenAmount > 0 && !p.isMarketTokenDeposit
      ? { method: "sendTokens", params: [p.initialLongTokenAddress, depositVaultAddress, p.longTokenAmount] }
      : undefined,

    !isNativeShortDeposit && p.shortTokenAmount > 0 && !p.isMarketTokenDeposit
      ? { method: "sendTokens", params: [p.initialShortTokenAddress, depositVaultAddress, p.shortTokenAmount] }
      : undefined,
    p.isMarketTokenDeposit
      ? {
          method: "sendTokens",
          params: [p.marketTokenAddress, depositVaultAddress, p.marketTokenAmount],
        }
      : undefined,
    {
      method: "createGlvDeposit",
      params: [
        {
          glv: p.glvAddress,
          market: p.marketTokenAddress,
          receiver: p.account,
          callbackContract: ethers.ZeroAddress,
          uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.ZeroAddress,
          initialLongToken: p.isMarketTokenDeposit ? ethers.ZeroAddress : initialLongTokenAddress,
          initialShortToken: p.isMarketTokenDeposit ? ethers.ZeroAddress : initialShortTokenAddress,
          longTokenSwapPath: [],
          shortTokenSwapPath: [],
          minGlvTokens: minGlvTokens,
          executionFee: p.executionFee,
          callbackGasLimit: 0n,
          shouldUnwrapNativeToken,
          isMarketTokenDeposit: p.isMarketTokenDeposit,
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
        method: "simulateExecuteLatestGlvDeposit",
        errorTitle: t`Deposit error.`,
        value: wntAmount,
        metricId: p.metricId,
        blockTimestampData: p.blockTimestampData,
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
    p.setPendingDeposit({
      account: p.account,
      marketAddress: p.marketTokenAddress,
      glvAddress: p.glvAddress,
      initialLongTokenAddress: p.isMarketTokenDeposit ? ethers.ZeroAddress : initialLongTokenAddress,
      initialShortTokenAddress: p.isMarketTokenDeposit ? ethers.ZeroAddress : initialShortTokenAddress,
      longTokenSwapPath: p.longTokenSwapPath,
      shortTokenSwapPath: p.shortTokenSwapPath,
      minMarketTokens: p.minMarketTokens,
      shouldUnwrapNativeToken,
      initialLongTokenAmount: p.longTokenAmount,
      initialShortTokenAmount: p.shortTokenAmount,
      initialMarketTokenAmount: p.isMarketTokenDeposit ? p.marketTokenAmount : 0n,
      isGlvDeposit: true,
      isMarketDeposit: p.isMarketTokenDeposit,
    });
  });
}
