import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { convertTokenAddress } from "config/tokens";
import { SetPendingWithdrawal } from "context/SyntheticsEvents";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { isAddressZero } from "lib/legacy";
import { applySlippageToMinOut } from "../trade";
import { TokensData } from "../tokens";
import { simulateExecuteOrderTxn } from "../orders/simulateExecuteOrderTxn";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { t } from "@lingui/macro";

type Params = {
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
  setPendingTxns: (txns: any) => void;
  setPendingWithdrawal: SetPendingWithdrawal;
};

export async function createWithdrawalTxn(chainId: number, signer: Signer, p: Params) {
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

  if (!p.skipSimulation) {
    await simulateExecuteOrderTxn(chainId, {
      account: p.account,
      primaryPriceOverrides: {},
      secondaryPriceOverrides: {},
      tokensData: p.tokensData,
      createOrderMulticallPayload: encodedPayload,
      method: "simulateExecuteWithdrawal",
      errorTitle: t`Withdrawal error.`,
      value: wntAmount,
    });
  }

  return callContract(chainId, contract, "multicall", [encodedPayload], {
    value: wntAmount,
    hideSentMsg: true,
    hideSuccessMsg: true,
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
