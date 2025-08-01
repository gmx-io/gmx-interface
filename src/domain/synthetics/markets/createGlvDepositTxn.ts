import { t } from "@lingui/macro";
import { Signer, ethers } from "ethers";

import { getContract } from "config/contracts";
import type { SetPendingDeposit } from "context/SyntheticsEvents";
import { callContract } from "lib/contracts";
import type { OrderMetricId } from "lib/metrics";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { validateSignerAddress } from "components/Errors/errorToasts";

import { prepareOrderTxn } from "../orders/prepareOrderTxn";
import { simulateExecuteTxn } from "../orders/simulateExecuteTxn";
import type { TokensData } from "../tokens";
import type { CreateGlvDepositParamsStruct } from "./types";

interface CreateGlvDepositParams {
  chainId: ContractsChainId;
  signer: Signer;
  longTokenAddress: string;
  shortTokenAddress: string;
  longTokenAmount: bigint;
  shortTokenAmount: bigint;
  executionFee: bigint;
  executionGasLimit: bigint;
  tokensData: TokensData;
  skipSimulation?: boolean;
  metricId?: OrderMetricId;
  blockTimestampData: BlockTimestampData | undefined;
  setPendingTxns: (txns: any) => void;
  setPendingDeposit: SetPendingDeposit;
  params: CreateGlvDepositParamsStruct;
  marketTokenAmount: bigint;
}

export async function createGlvDepositTxn({
  chainId,
  signer,
  params,
  longTokenAddress,
  shortTokenAddress,
  longTokenAmount,
  shortTokenAmount,
  marketTokenAmount,
  executionFee,
  executionGasLimit,
  tokensData,
  skipSimulation,
  metricId,
  blockTimestampData,
  setPendingTxns,
  setPendingDeposit,
}: CreateGlvDepositParams) {
  const contract = new ethers.Contract(getContract(chainId, "GlvRouter"), abis.GlvRouter, signer);
  const depositVaultAddress = getContract(chainId, "GlvVault");

  const isNativeLongDeposit = Boolean(
    longTokenAddress === NATIVE_TOKEN_ADDRESS && longTokenAmount != undefined && longTokenAmount > 0
  );
  const isNativeShortDeposit = Boolean(
    shortTokenAddress === NATIVE_TOKEN_ADDRESS && shortTokenAmount != undefined && shortTokenAmount > 0
  );

  await validateSignerAddress(signer, params.addresses.receiver);

  let wntDeposit = 0n;

  if (isNativeLongDeposit) {
    wntDeposit = wntDeposit + longTokenAmount!;
  }

  if (isNativeShortDeposit) {
    wntDeposit = wntDeposit + shortTokenAmount!;
  }

  const shouldUnwrapNativeToken = params.shouldUnwrapNativeToken;

  const wntAmount = executionFee + wntDeposit;

  const multicall = [
    { method: "sendWnt", params: [depositVaultAddress, wntAmount] },
    !isNativeLongDeposit && longTokenAmount > 0 && !params.isMarketTokenDeposit
      ? { method: "sendTokens", params: [params.addresses.initialLongToken, depositVaultAddress, longTokenAmount] }
      : undefined,

    !isNativeShortDeposit && shortTokenAmount > 0 && !params.isMarketTokenDeposit
      ? {
          method: "sendTokens",
          params: [params.addresses.initialShortToken, depositVaultAddress, shortTokenAmount],
        }
      : undefined,
    params.isMarketTokenDeposit
      ? {
          method: "sendTokens",
          params: [params.addresses.market, depositVaultAddress, marketTokenAmount],
        }
      : undefined,
    {
      method: "createGlvDeposit",
      params: [params],
    },
  ];

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => contract.interface.encodeFunctionData(call!.method, call!.params));

  const simulationPromise = !skipSimulation
    ? simulateExecuteTxn(chainId, {
        account: params.addresses.receiver,
        primaryPriceOverrides: {},
        tokensData,
        createMulticallPayload: encodedPayload,
        method: "simulateExecuteLatestGlvDeposit",
        errorTitle: t`Deposit error.`,
        value: wntAmount,
        metricId,
        blockTimestampData,
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
    metricId,
    gasLimit,
    gasPriceData,
    setPendingTxns,
    pendingTransactionData: {
      estimatedExecutionFee: executionFee,
      estimatedExecutionGasLimit: executionGasLimit,
    },
  }).then(() => {
    setPendingDeposit({
      account: params.addresses.receiver,
      marketAddress: params.addresses.market,
      glvAddress: params.addresses.glv,
      initialLongTokenAddress: params.addresses.initialLongToken,
      initialShortTokenAddress: params.addresses.initialShortToken,
      longTokenSwapPath: params.addresses.longTokenSwapPath,
      shortTokenSwapPath: params.addresses.shortTokenSwapPath,
      minMarketTokens: params.minGlvTokens,
      shouldUnwrapNativeToken,
      initialLongTokenAmount: longTokenAmount,
      initialShortTokenAmount: shortTokenAmount,
      initialMarketTokenAmount: params.isMarketTokenDeposit ? marketTokenAmount : 0n,
      isGlvDeposit: true,
      isMarketDeposit: params.isMarketTokenDeposit,
    });
  });
}
