import { BOTANIX } from "configs/chains";
import { getTokenBySymbol } from "configs/tokens";

export const getBotanixParams = ({
  chainId,
  payTokenAddress,
  receiveTokenAddress,
  isSwap,
}: {
  chainId: number;
  payTokenAddress: string;
  receiveTokenAddress: string | undefined;
  isSwap: boolean;
}) => {
  let isBotanixDeposit = false;
  let isBotanixRedeem = false;
  let isBotanixSwap = false;

  if (
    chainId === BOTANIX &&
    (payTokenAddress === getTokenBySymbol(BOTANIX, "PBTC").address ||
      payTokenAddress === getTokenBySymbol(BOTANIX, "BBTC").address) &&
    (receiveTokenAddress === getTokenBySymbol(BOTANIX, "STBTC").address || receiveTokenAddress === undefined)
  ) {
    isBotanixDeposit = true;
  }

  if (
    chainId === BOTANIX &&
    payTokenAddress === getTokenBySymbol(BOTANIX, "STBTC").address &&
    receiveTokenAddress === getTokenBySymbol(BOTANIX, "PBTC").address
  ) {
    isBotanixRedeem = true;
  }

  if (isSwap && receiveTokenAddress && (isBotanixDeposit || isBotanixRedeem)) {
    isBotanixSwap = true;
  }

  return {
    isBotanixDeposit,
    isBotanixRedeem,
    isBotanixSwap,
  };
};
