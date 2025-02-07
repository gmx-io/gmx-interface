import { ethers } from "ethers";
import Token from "sdk/abis/Token.json";

import { ExternalSwapQuote } from "../trade";
import { getNativeToken, getToken } from "sdk/configs/tokens";

const tokenContract = new ethers.Contract(ethers.ZeroAddress, Token.abi);

export function getExternalCallsParams(chainId: number, account: string, quote: ExternalSwapQuote) {
  if (!quote.txnData) {
    return [];
  }

  const addresses: string[] = [];
  const callData: string[] = [];

  const fromToken = getToken(chainId, quote.fromTokenAddress);

  if (quote.needSpenderApproval) {
    if (fromToken.shouldResetAllowance) {
      addresses.push(quote.fromTokenAddress);
      callData.push(tokenContract.interface.encodeFunctionData("approve", [quote.txnData.to, 0n]));
    } else {
      addresses.push(quote.fromTokenAddress);
      callData.push(tokenContract.interface.encodeFunctionData("approve", [quote.txnData.to, ethers.MaxUint256]));
    }
  }

  addresses.push(quote.txnData.to);
  callData.push(quote.txnData.data);

  const refundTokens = [getNativeToken(chainId).wrappedAddress, quote.fromTokenAddress];
  const refundReceivers = [account, account];

  return [addresses, callData, refundTokens, refundReceivers];
}
