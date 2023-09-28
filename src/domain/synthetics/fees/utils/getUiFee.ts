import { getContract } from "config/contracts";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { bigNumberify, expandDecimals } from "lib/numbers";

export default function getUiFee(chainId?: number, signer?: Signer) {
  const uiFeeReceiver = process.env.REACT_APP_UI_FEE_RECEIVER;
  const uiFeeFactor = bigNumberify("200000000000000000000000000");
  const maxUiFeeFactor = expandDecimals(1, 30);
  const factor = expandDecimals(1, 8);

  if (uiFeeReceiver && uiFeeFactor && maxUiFeeFactor) {
    //     const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);
    const percentage = uiFeeFactor.mul(factor).div(maxUiFeeFactor).toNumber();
    return percentage.toString();
  }
}
