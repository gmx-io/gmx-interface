import { bigMath } from "sdk/utils/bigmath";
import { Subaccount } from "../gassless/txns/subaccountUtils";
import useSWR from "swr";

export function useSubaccountWithdrawalAmount(chainId: number, subaccount: Subaccount | undefined) {
  const { data: estimatedWithdrawalAmounts } = useSWR(
    subaccount?.address ? ["useSubaccountWithdrawalAmount", chainId, subaccount?.address] : null,
    {
      fetcher: () => getEstimatedWithdrawalAmount(subaccount!),
    }
  );

  return estimatedWithdrawalAmounts;
}

export async function getEstimatedWithdrawalAmount(subaccount: Subaccount) {
  const subaccountAddress = subaccount.address;
  let wallet = subaccount.signer;

  if (!wallet.provider) {
    return undefined;
  }

  const [value, feeData] = await Promise.all([
    wallet.provider!.getBalance(subaccountAddress),
    wallet.provider!.getFeeData(),
  ]);

  const result = {
    amountToSend: 0n,
    gasCost: 0n,
    gasPrice: 0n,
    estimatedGas: 0n,
  };

  const gasPrice = feeData.gasPrice ?? 0n;
  const estimatedGas = 21000n;
  const amountToSend = value - gasPrice * estimatedGas;

  if (amountToSend < 0n) {
    return undefined;
  }

  result.estimatedGas = bigMath.mulDiv(
    (await wallet.estimateGas({
      to: subaccount.address,
      value,
    })) as bigint,
    100n,
    95n
  );

  result.gasCost = result.estimatedGas * result.gasPrice;
  result.amountToSend = value - result.gasCost;

  if (amountToSend < 0n) {
    return undefined;
  }

  return result;
}

export async function withdrawFromSubaccount({
  subaccount,
  mainAccountAddress,
}: {
  subaccount: Subaccount;
  mainAccountAddress: string;
}) {
  let wallet = subaccount.signer;

  if (!wallet.provider) throw new Error("No provider available.");

  const { amountToSend, gasPrice, estimatedGas } = await getEstimatedWithdrawalAmount(subaccount);

  if (amountToSend < 0n) {
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
