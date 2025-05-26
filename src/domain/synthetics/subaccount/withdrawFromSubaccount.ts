import useSWR from "swr";

import { bigMath } from "sdk/utils/bigmath";

import { Provider } from "ethers";
import { useJsonRpcProvider } from "lib/rpc";
import { SubaccountSerializedConfig } from "./types";
import { getSubaccountSigner } from "./utils";

export function useSubaccountWithdrawalAmount(
  chainId: number,
  subaccountAddress: string | undefined,
  gasPrice: bigint | undefined
) {
  const { provider } = useJsonRpcProvider(chainId);

  const { data: estimatedWithdrawalAmounts } = useSWR(
    subaccountAddress && gasPrice !== undefined && provider
      ? ["useSubaccountWithdrawalAmount", chainId, subaccountAddress, gasPrice]
      : null,
    {
      fetcher: () => getEstimatedWithdrawalAmount(provider!, subaccountAddress!, gasPrice!),
    }
  );

  return estimatedWithdrawalAmounts;
}

export async function getEstimatedWithdrawalAmount(provider: Provider, subaccountAddress: string, gasPrice: bigint) {
  const [value] = await Promise.all([provider.getBalance(subaccountAddress)]);

  const result = {
    amountToSend: 0n,
    gasPrice,
    estimatedGas: 0n,
  };

  result.estimatedGas = bigMath.mulDiv(
    (await provider.estimateGas({
      to: subaccountAddress,
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
  subaccountConfig,
  mainAccountAddress,
  gasPrice,
  provider,
}: {
  subaccountConfig: SubaccountSerializedConfig;
  mainAccountAddress: string;
  gasPrice: bigint;
  provider: Provider;
}) {
  const wallet = getSubaccountSigner(subaccountConfig, mainAccountAddress, provider);

  if (!wallet.provider) throw new Error("No provider available.");

  const result = await getEstimatedWithdrawalAmount(provider, subaccountConfig.address, gasPrice);

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
