import { t } from "@lingui/macro";
import ExchangeRouter from "sdk/abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "sdk/configs/tokens";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { SetPendingDeposit } from "context/SyntheticsEvents";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { simulateExecuteTxn } from "../orders/simulateExecuteTxn";
import { TokensData } from "../tokens";
import { applySlippageToMinOut } from "../trade";
import { OrderMetricId } from "lib/metrics/types";
import { prepareOrderTxn } from "../orders/prepareOrderTxn";
import { validateSignerAddress } from "lib/contracts/transactionErrors";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";

export type CreateDepositParams = {
  account: string;
  initialLongTokenAddress: string;
  initialShortTokenAddress: string;
  longTokenSwapPath: string[];
  shortTokenSwapPath: string[];
  marketTokenAddress: string;
  longTokenAmount: bigint;
  shortTokenAmount: bigint;
  minMarketTokens: bigint;
  executionFee: bigint;
  executionGasLimit: bigint;
  allowedSlippage: number;
  tokensData: TokensData;
  skipSimulation?: boolean;
  metricId?: OrderMetricId;
  blockTimestampData: BlockTimestampData | undefined;
  setPendingTxns: (txns: any) => void;
  setPendingDeposit: SetPendingDeposit;
};

export async function createDepositTxn(chainId: number, signer: Signer, p: CreateDepositParams) {
  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);
  const depositVaultAddress = getContract(chainId, "DepositVault");

  await validateSignerAddress(signer, p.account);

  const isNativeLongDeposit = Boolean(
    p.initialLongTokenAddress === NATIVE_TOKEN_ADDRESS && p.longTokenAmount != undefined && p.longTokenAmount > 0n
  );
  const isNativeShortDeposit = Boolean(
    p.initialShortTokenAddress === NATIVE_TOKEN_ADDRESS && p.shortTokenAmount != undefined && p.shortTokenAmount > 0n
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

  const minMarketTokens = applySlippageToMinOut(p.allowedSlippage, p.minMarketTokens);

  const multicall = [
    { method: "sendWnt", params: [depositVaultAddress, wntAmount] },

    !isNativeLongDeposit && p.longTokenAmount > 0n
      ? { method: "sendTokens", params: [p.initialLongTokenAddress, depositVaultAddress, p.longTokenAmount] }
      : undefined,

    !isNativeShortDeposit && p.shortTokenAmount > 0n
      ? { method: "sendTokens", params: [p.initialShortTokenAddress, depositVaultAddress, p.shortTokenAmount] }
      : undefined,

    {
      method: "createDeposit",
      params: [
        {
          receiver: p.account,
          callbackContract: ethers.ZeroAddress,
          market: p.marketTokenAddress,
          initialLongToken: initialLongTokenAddress,
          initialShortToken: initialShortTokenAddress,
          longTokenSwapPath: p.longTokenSwapPath,
          shortTokenSwapPath: p.shortTokenSwapPath,
          minMarketTokens: minMarketTokens,
          shouldUnwrapNativeToken: shouldUnwrapNativeToken,
          executionFee: p.executionFee,
          callbackGasLimit: 0n,
          uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.ZeroAddress,
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
        method: "simulateExecuteLatestDeposit",
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
    pendingTransactionData: {
      estimatedExecutionFee: p.executionFee,
      estimatedExecutionGasLimit: p.executionGasLimit,
    },
  }).then(() => {
    p.setPendingDeposit({
      account: p.account,
      marketAddress: p.marketTokenAddress,
      initialLongTokenAddress,
      initialShortTokenAddress,
      longTokenSwapPath: p.longTokenSwapPath,
      shortTokenSwapPath: p.shortTokenSwapPath,
      initialLongTokenAmount: p.longTokenAmount,
      initialShortTokenAmount: p.shortTokenAmount,
      minMarketTokens: minMarketTokens,
      shouldUnwrapNativeToken,
      isGlvDeposit: false,
    });
  });
}
