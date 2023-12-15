import { ethers } from "ethers";
import { getProvider } from "lib/rpc";

export async function withdrawFromSubaccount({
  chainId,
  privateKey,
  mainAccountAddress,
}: {
  chainId: number;
  privateKey: string;
  mainAccountAddress: string;
}) {
  const provider = getProvider(undefined, chainId);
  const wallet = new ethers.Wallet(privateKey, provider);
  const value = await wallet.getBalance();

  const gasPrice = await provider.getGasPrice();
  const gasLimit = 21000;
  const gasCost = gasPrice.mul(gasLimit);

  const amountToSend = value.sub(gasCost);

  if (amountToSend.lt(0)) {
    throw new Error("Insufficient funds to cover gas cost.");
  }

  const tx = {
    to: mainAccountAddress,
    value: amountToSend,
    gasPrice: gasPrice,
    gasLimit: gasLimit,
  };

  const signedTransaction = await wallet.sendTransaction(tx);
  return signedTransaction.wait();
}
