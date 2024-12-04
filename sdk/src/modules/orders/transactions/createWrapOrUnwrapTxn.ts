import WETH from "abis/WETH.json";
import { getWrappedToken } from "configs/tokens";
import { GmxSdk } from "../../../index";
import { Abi, Address } from "viem";

export type WrapOrUnwrapParams = {
  amount: bigint;
  isWrap: boolean;
};

export function createWrapOrUnwrapTxn(sdk: GmxSdk, p: WrapOrUnwrapParams) {
  const wrappedToken = getWrappedToken(sdk.chainId);

  if (p.isWrap) {
    return sdk.callContract(wrappedToken.address as Address, WETH.abi as Abi, "deposit", [], {
      value: p.amount,
    });
  } else {
    return sdk.callContract(wrappedToken.address as Address, WETH.abi as Abi, "withdraw", [p.amount]);
  }
}
