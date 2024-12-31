import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { bigMath } from "sdk/utils/bigmath";

export async function withdrawFromSubaccount({
  subaccount,
  mainAccountAddress,
}: {
  subaccount: Subaccount;
  mainAccountAddress: string;
}) {
  if (!subaccount) throw new Error("No subaccount available.");

  const subaccountAddress = subaccount.address;
  const wallet = subaccount.signer;

  if (!wallet.provider) throw new Error("No provider available.");

  const [value, feeData] = await Promise.all([
    wallet.provider.getBalance(subaccountAddress),
    wallet.provider.getFeeData(),
  ]);
  const gasPrice = feeData.gasPrice ?? 0n;
  const gasLimit = 21000n;
  const approxAmountToSend = value - gasPrice * gasLimit;

  if (approxAmountToSend < 0) {
    throw new Error("Insufficient funds to cover gas cost.");
  }

  const estimatedGas = bigMath.mulDiv(
    (await wallet.estimateGas({
      to: mainAccountAddress,
      value,
    })) as bigint,
    100n,
    95n
  );

  const gasCost = estimatedGas * gasPrice;
  const amountToSend = value - gasCost;

  if (amountToSend < 0) {
    throw new Error("Insufficient funds to cover gas cost.");
  }

  const signedTransaction = await wallet.sendTransaction({
    to: mainAccountAddress,
    value: amountToSend,
    gasLimit: estimatedGas,
    gasPrice,
    nonce: await wallet.getNonce(),
  });

  return signedTransaction.wait();
}
