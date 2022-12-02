import { Web3Provider } from "@ethersproject/providers";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { getWrappedToken } from "config/tokens";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { isAddressZero } from "lib/legacy";
import { bigNumberify, expandDecimals } from "lib/numbers";

export async function createMarketDepositTxn(
  chainId: number,
  library: Web3Provider,
  p: {
    account: string;
    longTokenAddress: string;
    shortTokenAddress: string;
    longTokenAmount?: BigNumber;
    marketTokenAddress: string;
    shortTokenAmount?: BigNumber;
    minMarketTokens: BigNumber;
  },
  opts: any
) {
  const exchangeRouterAddress = getContract(chainId, "ExchangeRouter");
  const contract = new ethers.Contract(exchangeRouterAddress, ExchangeRouter.abi, library.getSigner());

  const wrappedToken = getWrappedToken(chainId);

  const longTokenAddress = isAddressZero(p.longTokenAddress) ? wrappedToken.address : p.longTokenAddress;
  const shortTokenAddress = isAddressZero(p.shortTokenAddress) ? wrappedToken.address : p.shortTokenAddress;

  const shouldUnwrapNativeToken =
    (isAddressZero(p.longTokenAddress) && p.longTokenAmount?.gt(0)) ||
    (isAddressZero(p.shortTokenAddress) && p.shortTokenAmount?.gt(0));

  const params = [
    longTokenAddress,
    shortTokenAddress,
    p.longTokenAmount || BigNumber.from(0),
    p.shortTokenAmount || BigNumber.from(0),
    {
      // TODO: valid params
      callbackContract: ethers.constants.AddressZero,
      executionFee: expandDecimals(1, 15),
      callbackGasLimit: BigNumber.from(0),
      receiver: p.account,
      minMarketTokens: BigNumber.from(0),
      market: p.marketTokenAddress,
      shouldUnwrapNativeToken,
    },
  ];

  return callContract(chainId, contract, "createDeposit", params, { ...opts, gasLimit: bigNumberify(1000000) });
}
