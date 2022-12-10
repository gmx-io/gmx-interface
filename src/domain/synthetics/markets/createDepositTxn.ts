import { Web3Provider } from "@ethersproject/providers";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import { isAddressZero } from "lib/legacy";
import { ExchangeRouter__factory } from "typechain-types";

type Params = {
  account: string;
  longTokenAddress: string;
  shortTokenAddress: string;
  marketTokenAddress: string;
  longTokenAmount?: BigNumber;
  shortTokenAmount?: BigNumber;
  minMarketTokens: BigNumber;
  executionFee: BigNumber;
};

export async function createDepositTxn(chainId: number, library: Web3Provider, p: Params, opts: any) {
  const contract = ExchangeRouter__factory.connect(getContract(chainId, "ExchangeRouter"), library.getSigner());
  const depositStoreAdress = getContract(chainId, "DepositStore");

  const isNativeDeposit = Boolean(isAddressZero(p.longTokenAddress) && p.longTokenAmount?.gt(0));

  const wntDeposit = isNativeDeposit ? p.longTokenAmount! : BigNumber.from(0);

  const wntAmount = p.executionFee.add(wntDeposit);

  const sendLongTokenCall =
    !isNativeDeposit && p.longTokenAmount?.gt(0)
      ? contract.interface.encodeFunctionData("sendTokens", [p.longTokenAddress, depositStoreAdress, p.longTokenAmount])
      : undefined;

  const sendShortTokenCall = p.shortTokenAmount?.gt(0)
    ? contract.interface.encodeFunctionData("sendTokens", [p.shortTokenAddress, depositStoreAdress, p.shortTokenAmount])
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
        minMarketTokens: p.minMarketTokens,
        shouldUnwrapNativeToken: isNativeDeposit,
        executionFee: p.executionFee,
        callbackGasLimit: BigNumber.from(0),
      },
    ]),
  ].filter(Boolean) as string[];

  const tx = await contract.multicall(multicall, {
    value: wntAmount,
    gasLimit: 10 ** 6,
  });

  return tx;
}
