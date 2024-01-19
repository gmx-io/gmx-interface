import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { BigNumber } from "ethers";

export async function withdrawFromSubaccount({
  subaccount,
  mainAccountAddress,
}: {
  subaccount: Subaccount;
  mainAccountAddress: string;
}) {
  if (!subaccount) throw new Error("No subaccount available.");

  const wallet = subaccount.wallet;
  const [value, gasPrice] = await Promise.all([wallet.getBalance(), wallet.getGasPrice()]);
  const gasLimit = 21000;
  const approxAmountToSend = value.sub(gasPrice.mul(gasLimit));

  if (approxAmountToSend.lt(0)) {
    throw new Error("Insufficient funds to cover gas cost.");
  }

  const estimatedGas = (
    (await wallet.estimateGas({
      to: mainAccountAddress,
      value,
    })) as BigNumber
  )
    .mul(100)
    .div(95);

  const gasCost = estimatedGas.mul(gasPrice);
  const amountToSend = value.sub(gasCost);

  if (amountToSend.lt(0)) {
    throw new Error("Insufficient funds to cover gas cost.");
  }

  const signedTransaction = await wallet.sendTransaction({
    to: mainAccountAddress,
    value: amountToSend,
    gasLimit: estimatedGas,
    gasPrice,
    nonce: await wallet.getTransactionCount(),
  });

  return signedTransaction.wait();
}
