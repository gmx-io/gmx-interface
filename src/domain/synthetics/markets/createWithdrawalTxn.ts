import { Web3Provider } from "@ethersproject/providers";
import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import { TransactionParams } from "lib/contracts";
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

export function createWithdrawalTxn(chainId: number, library: Web3Provider, p: Params): TransactionParams {
  const contract = ExchangeRouter__factory.connect(getContract(chainId, "ExchangeRouter"), library.getSigner());
  const withdrawalStoreAddress = getContract(chainId, "WithdrawalStore");

  const isNativeWithdrawal = Boolean(isAddressZero(p.longTokenAddress) && p.marketLongAmount?.gt(0));

  const wntAmount = p.executionFee;

  const multicall = [
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
  ];

  return {
    contract,
    method: "multicall",
    params: [multicall],
    opts: {
      value: wntAmount,
      gasLimit: 10 ** 6,
      sentMsg: t`Withdrawal order sent`,
      successMsg: t`Success withdrawal order`,
      failMsg: t`Withdrawal order failed`,
    },
  };
}
