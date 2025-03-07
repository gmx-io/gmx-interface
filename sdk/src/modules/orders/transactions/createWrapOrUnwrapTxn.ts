import { Abi, Address } from "viem";

import { getWrappedToken } from "configs/tokens";
import { abis } from "abis";

import type { GmxSdk } from "../../../index";

export type WrapOrUnwrapParams = {
  amount: bigint;
  isWrap: boolean;
};

export function createWrapOrUnwrapTxn(sdk: GmxSdk, p: WrapOrUnwrapParams) {
  const wrappedToken = getWrappedToken(sdk.chainId);

  if (p.isWrap) {
    return sdk.callContract(wrappedToken.address as Address, abis.WETH as Abi, "deposit", [], {
      value: p.amount,
    });
  } else {
    return sdk.callContract(wrappedToken.address as Address, abis.WETH as Abi, "withdraw", [p.amount]);
  }
}
