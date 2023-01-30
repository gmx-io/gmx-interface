import { Web3Provider } from "@ethersproject/providers";
import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { isAddressZero } from "lib/legacy";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { convertTokenAddress } from "config/tokens";

type Params = {
  account: string;
  initialLongTokenAddress?: string;
  initialShortTokenAddress?: string;
  marketTokenAddress: string;
  longTokenAmount?: BigNumber;
  shortTokenAmount?: BigNumber;
  minMarketTokens: BigNumber;
  executionFee: BigNumber;
};

export async function createDepositTxn(chainId: number, library: Web3Provider, p: Params) {
  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, library.getSigner());
  const depositVaultAddress = getContract(chainId, "DepositVault");

  const isNativeDeposit = Boolean(isAddressZero(p.initialLongTokenAddress) && p.longTokenAmount?.gt(0));

  const wntDeposit = isNativeDeposit ? p.longTokenAmount! : BigNumber.from(0);

  const wntAmount = p.executionFee.add(wntDeposit);

  const sendLongTokenCall =
    !isNativeDeposit && p.longTokenAmount?.gt(0)
      ? contract.interface.encodeFunctionData("sendTokens", [
          p.initialLongTokenAddress,
          depositVaultAddress,
          p.longTokenAmount,
        ])
      : undefined;

  const sendShortTokenCall = p.shortTokenAmount?.gt(0)
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
        initialLongToken: p.initialLongTokenAddress
          ? convertTokenAddress(chainId, p.initialLongTokenAddress, "wrapped")
          : ethers.constants.AddressZero,
        initialShortToken: p.initialShortTokenAddress
          ? convertTokenAddress(chainId, p.initialShortTokenAddress, "wrapped")
          : ethers.constants.AddressZero,
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
        // TODO: correct slippage
        minMarketTokens: BigNumber.from(0),
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
  });
}
