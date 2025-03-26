import { t } from "@lingui/macro";
import { Signer, ethers } from "ethers";

import { getContract } from "config/contracts";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import type { SetPendingShift } from "context/SyntheticsEvents";
import { callContract } from "lib/contracts";
import { validateSignerAddress } from "lib/contracts/transactionErrors";
import { OrderMetricId } from "lib/metrics/types";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { abis } from "sdk/abis";

import { prepareOrderTxn } from "../orders/prepareOrderTxn";
import { simulateExecuteTxn } from "../orders/simulateExecuteTxn";
import type { TokensData } from "../tokens";
import { applySlippageToMinOut } from "../trade";

type Params = {
  account: string;
  fromMarketTokenAddress: string;
  fromMarketTokenAmount: bigint;
  toMarketTokenAddress: string;
  minToMarketTokenAmount: bigint;
  executionFee: bigint;
  executionGasLimit: bigint;
  allowedSlippage: number;
  tokensData: TokensData;
  skipSimulation?: boolean;
  metricId?: OrderMetricId;
  blockTimestampData: BlockTimestampData | undefined;
  setPendingTxns: (txns: any) => void;
  setPendingShift: SetPendingShift;
};

export async function createShiftTxn(chainId: number, signer: Signer, p: Params) {
  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);
  const shiftVaultAddress = getContract(chainId, "ShiftVault");

  const minToMarketTokenAmount = applySlippageToMinOut(p.allowedSlippage, p.minToMarketTokenAmount);

  await validateSignerAddress(signer, p.account);

  const multicall = [
    { method: "sendWnt", params: [shiftVaultAddress, p.executionFee] },
    { method: "sendTokens", params: [p.fromMarketTokenAddress, shiftVaultAddress, p.fromMarketTokenAmount] },
    {
      method: "createShift",
      params: [
        {
          receiver: p.account,
          callbackContract: ethers.ZeroAddress,
          uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.ZeroAddress,
          fromMarket: p.fromMarketTokenAddress,
          toMarket: p.toMarketTokenAddress,
          minMarketTokens: minToMarketTokenAmount,
          executionFee: p.executionFee,
          callbackGasLimit: 0n,
        },
      ],
    },
  ];

  const encodedPayload = multicall.map((call) => contract.interface.encodeFunctionData(call!.method, call!.params));

  const simulationPromise = !p.skipSimulation
    ? simulateExecuteTxn(chainId, {
        account: p.account,
        primaryPriceOverrides: {},
        tokensData: p.tokensData,
        createMulticallPayload: encodedPayload,
        method: "simulateExecuteLatestShift",
        errorTitle: t`Shift error.`,
        value: p.executionFee,
        metricId: p.metricId,
        blockTimestampData: p.blockTimestampData,
      })
    : undefined;

  const { gasLimit, gasPriceData } = await prepareOrderTxn(
    chainId,
    contract,
    "multicall",
    [encodedPayload],
    p.executionFee,
    undefined,
    simulationPromise,
    p.metricId
  );

  return callContract(chainId, contract, "multicall", [encodedPayload], {
    value: p.executionFee,
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
    p.setPendingShift({
      account: p.account,
      fromMarket: p.fromMarketTokenAddress,
      marketTokenAmount: p.fromMarketTokenAmount,
      toMarket: p.toMarketTokenAddress,
      minMarketTokens: minToMarketTokenAmount,
    });
  });
}
