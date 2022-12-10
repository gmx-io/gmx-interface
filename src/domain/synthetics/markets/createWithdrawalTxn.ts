import { Web3Provider } from "@ethersproject/providers";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import { isAddressZero } from "lib/legacy";
import { ExchangeRouter__factory } from "typechain-types";

type Params = {
  account: string;
  longTokenAddress: string;
  marketTokenAddress: string;
  marketLongAmount?: BigNumber;
  marketShortAmount?: BigNumber;
  minLongTokenAmount?: BigNumber;
  minShortTokenAmount?: BigNumber;
  executionFee: BigNumber;
};

export async function createWithdrawalTxn(chainId: number, library: Web3Provider, p: Params, opts: any) {
  const contract = ExchangeRouter__factory.connect(getContract(chainId, "ExchangeRouter"), library.getSigner());
  const withdrawalStoreAddress = getContract(chainId, "WithdrawalStore");

  const isNativeWithdrawal = Boolean(isAddressZero(p.longTokenAddress) && p.marketLongAmount?.gt(0));

  const wntAmount = p.executionFee;

  const tx = await contract.multicall(
    [
      contract.interface.encodeFunctionData("sendWnt", [withdrawalStoreAddress, wntAmount]),
      contract.interface.encodeFunctionData("createWithdrawal", [
        {
          receiver: p.account,
          callbackContract: ethers.constants.AddressZero,
          market: p.marketTokenAddress,
          marketTokensLongAmount: p.marketLongAmount || BigNumber.from(0),
          marketTokensShortAmount: p.marketShortAmount || BigNumber.from(0),
          minLongTokenAmount: p.minLongTokenAmount || BigNumber.from(0),
          minShortTokenAmount: p.minShortTokenAmount || BigNumber.from(0),
          shouldUnwrapNativeToken: isNativeWithdrawal,
          executionFee: p.executionFee,
          callbackGasLimit: BigNumber.from(0),
        },
      ]),
    ],
    {
      value: wntAmount,
      gasLimit: 10 ** 6,
    }
  );

  // console.log(tx);

  return tx;
}
