import { Web3Provider } from "@ethersproject/providers";
import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";

type Params = {
  account: string;
  initialLongTokenAddress: string;
  initialShortTokenAddress: string;
  marketTokenAddress: string;
  longTokenAmount?: BigNumber;
  shortTokenAmount?: BigNumber;
  minMarketTokens: BigNumber;
  executionFee: BigNumber;
  setPendingTxns: (txns: any) => void;
};

export async function createDepositTxn(chainId: number, library: Web3Provider, p: Params) {
  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, library.getSigner());
  const depositVaultAddress = getContract(chainId, "DepositVault");

  const isNativeLongDeposit = p.initialLongTokenAddress === NATIVE_TOKEN_ADDRESS && p.longTokenAmount?.gt(0);
  const isNativeShortDeposit = p.initialShortTokenAddress === NATIVE_TOKEN_ADDRESS && p.shortTokenAmount?.gt(0);

  let wntDeposit = BigNumber.from(0);

  if (isNativeLongDeposit) {
    wntDeposit = wntDeposit.add(p.longTokenAmount!);
  }

  if (isNativeShortDeposit) {
    wntDeposit = wntDeposit.add(p.shortTokenAmount!);
  }

  const wntAmount = p.executionFee.add(wntDeposit);

  const sendLongTokenCall =
    !isNativeLongDeposit && p.longTokenAmount?.gt(0)
      ? contract.interface.encodeFunctionData("sendTokens", [
          p.initialLongTokenAddress,
          depositVaultAddress,
          p.longTokenAmount,
        ])
      : undefined;

  const sendShortTokenCall =
    !isNativeShortDeposit && p.shortTokenAmount?.gt(0)
      ? contract.interface.encodeFunctionData("sendTokens", [
          p.initialShortTokenAddress,
          depositVaultAddress,
          p.shortTokenAmount,
        ])
      : undefined;

  const multicall = [
    contract.interface.encodeFunctionData("sendWnt", [depositVaultAddress, wntAmount]),
    sendLongTokenCall,
    sendShortTokenCall,
    contract.interface.encodeFunctionData("createDeposit", [
      {
        receiver: p.account,
        callbackContract: ethers.constants.AddressZero,
        market: p.marketTokenAddress,
        initialLongToken: convertTokenAddress(chainId, p.initialLongTokenAddress, "wrapped"),
        initialShortToken: convertTokenAddress(chainId, p.initialShortTokenAddress, "wrapped"),
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
        minMarketTokens: p.minMarketTokens.sub(p.minMarketTokens.div(10)) || BigNumber.from(0),
        shouldUnwrapNativeToken: false,
        executionFee: p.executionFee,
        callbackGasLimit: BigNumber.from(0),
      },
    ]),
  ].filter(Boolean) as string[];

  return callContract(chainId, contract, "multicall", [multicall], {
    value: wntAmount,
    sentMsg: t`Deposit order sent`,
    successMsg: t`Success deposit order`,
    failMsg: t`Deposit order failed`,
    hideSuccessMsg: true,
    setPendingTxns: p.setPendingTxns,
  });
}
