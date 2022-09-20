import { BigNumber } from "ethers";
import { expandDecimals, getTokenInfo, PRECISION, USDG_ADDRESS } from "../../lib/legacy";
import { InfoTokens, TokenInfo } from "./types";

export function getTokenAmountFromUsd(
    infoTokens: InfoTokens,
    tokenAddress: string,
    usdAmount?: BigNumber,
    opts: {
        max?: boolean
        overridePrice?: BigNumber,
    } = {},
) {
    if (!usdAmount) {
      return;
    }

    if (tokenAddress === USDG_ADDRESS) {
      return usdAmount.mul(expandDecimals(1, 18)).div(PRECISION);
    }

    const info: TokenInfo | undefined = getTokenInfo(infoTokens, tokenAddress);

    if (!info) {
      return;
    }

    const price = opts.overridePrice || (opts.max ? info.maxPrice : info.minPrice);

    if (!price?.gt(0)) {
      return;
    }

    return usdAmount.mul(expandDecimals(1, info.decimals)).div(price);
  }
