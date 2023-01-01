import { Web3Provider } from "@ethersproject/providers";
import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { isAddressZero } from "lib/legacy";
import ExchangeRouter from "abis/ExchangeRouter.json";

type Params = {
  account: string;
  longTokenAddress?: string;
  shortTokenAddress?: string;
  marketTokenAddress: string;
  longTokenAmount?: BigNumber;
  shortTokenAmount?: BigNumber;
  minMarketTokens: BigNumber;
  executionFee: BigNumber;
};

export function createDepositTxn(chainId: number, library: Web3Provider, p: Params) {
  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, library.getSigner());
  const depositStoreAdress = getContract(chainId, "DepositStore");

  const isNativeDeposit = Boolean(isAddressZero(p.longTokenAddress) && p.longTokenAmount?.gt(0));

  const wntDeposit = isNativeDeposit ? p.longTokenAmount! : BigNumber.from(0);

  const wntAmount = p.executionFee.add(wntDeposit);

  const sendLongTokenCall =
    !isNativeDeposit && p.longTokenAmount?.gt(0) && p.longTokenAddress
      ? contract.interface.encodeFunctionData("sendTokens", [p.longTokenAddress, depositStoreAdress, p.longTokenAmount])
      : undefined;

  const sendShortTokenCall =
    p.shortTokenAmount?.gt(0) && p.shortTokenAddress
      ? contract.interface.encodeFunctionData("sendTokens", [
          p.shortTokenAddress,
          depositStoreAdress,
          p.shortTokenAmount,
        ])
      : undefined;

  const multicall = [
    contract.interface.encodeFunctionData("sendWnt", [depositStoreAdress, wntAmount]),
    sendLongTokenCall,
    sendShortTokenCall,
    contract.interface.encodeFunctionData("createDeposit", [
      {
        receiver: p.account,
        callbackContract: ethers.constants.AddressZero,
        market: p.marketTokenAddress,
        // TODO: correct slippage
        minMarketTokens: p.minMarketTokens?.div(2) || BigNumber.from(0),
        shouldUnwrapNativeToken: isNativeDeposit,
        executionFee: p.executionFee,
        callbackGasLimit: BigNumber.from(0),
      },
    ]),
  ].filter(Boolean) as string[];

  return callContract(chainId, contract, "multicall", [multicall], {
    value: wntAmount,
    sentMsg: t`Deposit order sent`,
    successMsg: t`Success deposit order`,
    failMsg: t`Despoit order failed`,
  });
}
