import { NATIVE_TOKEN_ADDRESS, getToken, getWrappedToken } from "config/tokens";
import { callContract } from "lib/contracts";
import WETH from "abis/WETH.json";
import { Signer, ethers } from "ethers";
import { t } from "@lingui/macro";
import { formatTokenAmount } from "lib/numbers";

type WrapOrUnwrapParams = {
  amount: bigint;
  isWrap: boolean;
  setPendingTxns: (txns: any) => void;
};

export function createWrapOrUnwrapTxn(chainId: number, signer: Signer, p: WrapOrUnwrapParams) {
  const wrappedToken = getWrappedToken(chainId);
  const nativeToken = getToken(chainId, NATIVE_TOKEN_ADDRESS);

  const contract = new ethers.Contract(wrappedToken.address, WETH.abi, signer);

  if (p.isWrap) {
    return callContract(chainId, contract, "deposit", [], {
      value: p.amount,
      sentMsg: t`Swap submitted.`,
      successMsg: t`Swapped ${formatTokenAmount(
        p.amount,
        nativeToken.decimals,
        nativeToken.symbol
      )} for ${formatTokenAmount(p.amount, wrappedToken.decimals, wrappedToken.symbol)}`,
      failMsg: t`Swap failed.`,
      setPendingTxns: p.setPendingTxns,
    });
  } else {
    return callContract(chainId, contract, "withdraw", [p.amount], {
      sentMsg: t`Swap submitted.`,
      successMsg: t`Swapped ${formatTokenAmount(
        p.amount,
        wrappedToken.decimals,
        wrappedToken.symbol
      )} for ${formatTokenAmount(p.amount, nativeToken.decimals, nativeToken.symbol)}`,
      failMsg: t`Swap failed.`,
      setPendingTxns: p.setPendingTxns,
    });
  }
}
