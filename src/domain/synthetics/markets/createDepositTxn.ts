import { t } from "@lingui/macro";
import { Contract, Signer } from "ethers";

import { getContract } from "config/contracts";
import type { SetPendingDeposit } from "context/SyntheticsEvents";
import { callContract } from "lib/contracts";
import type { OrderMetricId } from "lib/metrics/types";
import type { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { validateSignerAddress } from "components/Errors/errorToasts";

import { prepareOrderTxn } from "../orders/prepareOrderTxn";
import { simulateExecuteTxn } from "../orders/simulateExecuteTxn";
import type { TokensData } from "../tokens";
import type { CreateDepositParams } from "./types";

export async function createDepositTxn({
  chainId,
  signer,
  params,
  longTokenAmount,
  shortTokenAmount,
  executionFee,
  executionGasLimit,
  tokensData,
  skipSimulation,
  metricId,
  blockTimestampData,
  setPendingTxns,
  setPendingDeposit,
}: {
  chainId: ContractsChainId;
  signer: Signer;
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
  params: CreateDepositParams;
}) {
  const contract = new Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);
  const depositVaultAddress = getContract(chainId, "DepositVault");

  await validateSignerAddress(signer, params.addresses.receiver);

  const isNativeLongDeposit = Boolean(
    params.addresses.initialLongToken === NATIVE_TOKEN_ADDRESS && longTokenAmount != undefined && longTokenAmount > 0
  );
  const isNativeShortDeposit = Boolean(
    params.addresses.initialShortToken === NATIVE_TOKEN_ADDRESS && shortTokenAmount != undefined && shortTokenAmount > 0
  );

  let wntDeposit = 0n;

  if (isNativeLongDeposit) {
    wntDeposit = wntDeposit + longTokenAmount!;
  }

  if (isNativeShortDeposit) {
    wntDeposit = wntDeposit + shortTokenAmount!;
  }

  const shouldUnwrapNativeToken = isNativeLongDeposit || isNativeShortDeposit;

  const wntAmount = executionFee + wntDeposit;

  const multicall = [
    { method: "sendWnt", params: [depositVaultAddress, wntAmount] },

    !isNativeLongDeposit && longTokenAmount > 0
      ? { method: "sendTokens", params: [params.addresses.initialLongToken, depositVaultAddress, longTokenAmount] }
      : undefined,

    !isNativeShortDeposit && shortTokenAmount > 0
      ? {
          method: "sendTokens",
          params: [params.addresses.initialShortToken, depositVaultAddress, shortTokenAmount],
        }
      : undefined,

    {
      method: "createDeposit",
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
        method: "simulateExecuteLatestDeposit",
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
      initialLongTokenAddress: params.addresses.initialLongToken,
      initialShortTokenAddress: params.addresses.initialShortToken,
      longTokenSwapPath: params.addresses.longTokenSwapPath,
      shortTokenSwapPath: params.addresses.shortTokenSwapPath,
      initialLongTokenAmount: longTokenAmount,
      initialShortTokenAmount: shortTokenAmount,
      minMarketTokens: params.minMarketTokens,
      shouldUnwrapNativeToken,
      isGlvDeposit: false,
    });
  });
}
