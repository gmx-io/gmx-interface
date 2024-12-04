import { t } from "@lingui/macro";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { convertTokenAddress } from "config/tokens";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { SetPendingWithdrawal } from "context/SyntheticsEvents";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { isAddressZero } from "lib/legacy";
import { OrderMetricId } from "lib/metrics/types";
import { SwapPricingType } from "../orders";
import { simulateExecuteTxn } from "../orders/simulateExecuteTxn";
import { TokensData } from "../tokens";
import { applySlippageToMinOut } from "../trade";
import { prepareOrderTxn } from "../orders/prepareOrderTxn";
import { BlockTimestampData } from "lib/useBlockTimestamp";

export type CreateWithdrawalParams = {
  account: string;
  marketTokenAddress: string;
  marketTokenAmount: bigint;
  initialLongTokenAddress: string;
  minLongTokenAmount: bigint;
  longTokenSwapPath: string[];
  initialShortTokenAddress: string;
  shortTokenSwapPath: string[];
  minShortTokenAmount: bigint;
  executionFee: bigint;
  allowedSlippage: number;
  skipSimulation?: boolean;
  tokensData: TokensData;
  blockTimestampData: BlockTimestampData | undefined;
  metricId?: OrderMetricId;
  setPendingTxns: (txns: any) => void;
  setPendingWithdrawal: SetPendingWithdrawal;
};

export async function createWithdrawalTxn(chainId: number, signer: Signer, p: CreateWithdrawalParams) {
  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);
  const withdrawalVaultAddress = getContract(chainId, "WithdrawalVault");

  const isNativeWithdrawal = isAddressZero(p.initialLongTokenAddress) || isAddressZero(p.initialShortTokenAddress);

  const wntAmount = p.executionFee;

  const initialLongTokenAddress = convertTokenAddress(chainId, p.initialLongTokenAddress, "wrapped");
  const initialShortTokenAddress = convertTokenAddress(chainId, p.initialShortTokenAddress, "wrapped");

  const minLongTokenAmount = applySlippageToMinOut(p.allowedSlippage, p.minLongTokenAmount);
  const minShortTokenAmount = applySlippageToMinOut(p.allowedSlippage, p.minShortTokenAmount);

  const multicall = [
    { method: "sendWnt", params: [withdrawalVaultAddress, wntAmount] },
    { method: "sendTokens", params: [p.marketTokenAddress, withdrawalVaultAddress, p.marketTokenAmount] },
    {
      method: "createWithdrawal",
      params: [
        {
          receiver: p.account,
          callbackContract: ethers.ZeroAddress,
          market: p.marketTokenAddress,
          initialLongToken: initialLongTokenAddress,
          initialShortToken: initialShortTokenAddress,
          longTokenSwapPath: p.longTokenSwapPath,
          shortTokenSwapPath: p.shortTokenSwapPath,
          marketTokenAmount: p.marketTokenAmount,
          minLongTokenAmount,
          minShortTokenAmount,
          shouldUnwrapNativeToken: isNativeWithdrawal,
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
        method: "simulateExecuteLatestWithdrawal",
        errorTitle: t`Withdrawal error.`,
        value: wntAmount,
        swapPricingType: SwapPricingType.TwoStep,
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
    p.setPendingWithdrawal({
      account: p.account,
      marketAddress: p.marketTokenAddress,
      marketTokenAmount: p.marketTokenAmount,
      minLongTokenAmount,
      minShortTokenAmount,
      shouldUnwrapNativeToken: isNativeWithdrawal,
    });
  });
}
