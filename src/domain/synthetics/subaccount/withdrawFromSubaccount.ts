import useSWR from "swr";

import { bigMath } from "sdk/utils/bigmath";

import { Subaccount } from "../gassless/txns/subaccountUtils";

export function useSubaccountWithdrawalAmount(
  chainId: number,
  subaccount: Subaccount | undefined,
  gasPrice: bigint | undefined
) {
  const { data: estimatedWithdrawalAmounts } = useSWR(
    subaccount?.address && gasPrice !== undefined
      ? ["useSubaccountWithdrawalAmount", chainId, subaccount?.address, gasPrice]
      : null,
    {
      fetcher: () => getEstimatedWithdrawalAmount(subaccount!, gasPrice!),
    }
  );

  return estimatedWithdrawalAmounts;
}

export async function getEstimatedWithdrawalAmount(subaccount: Subaccount, gasPrice: bigint) {
  const subaccountAddress = subaccount.address;
  let wallet = subaccount.signer;

  if (!wallet.provider) {
    return undefined;
  }

  const [value] = await Promise.all([wallet.provider!.getBalance(subaccountAddress)]);

  const result = {
    amountToSend: 0n,
    gasPrice,
    estimatedGas: 0n,
  };

  result.estimatedGas = bigMath.mulDiv(
    (await wallet.estimateGas({
      to: subaccount.address,
      value,
    })) as bigint,
    13n,
    10n
  );

  result.amountToSend = value - gasPrice * result.estimatedGas;

  if (result.amountToSend < 0n) {
    return undefined;
  }

  return result;
}

export async function withdrawFromSubaccount({
  subaccount,
  mainAccountAddress,
  gasPrice,
}: {
  subaccount: Subaccount;
  mainAccountAddress: string;
  gasPrice: bigint;
}) {
  let wallet = subaccount.signer;

  if (!wallet.provider) throw new Error("No provider available.");

  const result = await getEstimatedWithdrawalAmount(subaccount, gasPrice);

  if (!result) {
    throw new Error("Insufficient funds to cover gas cost.");
  }

  const { amountToSend, estimatedGas } = result;

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
