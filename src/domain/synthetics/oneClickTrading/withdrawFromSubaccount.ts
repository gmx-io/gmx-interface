import { BigNumber, ethers } from "ethers";
import { getProvider } from "lib/rpc";

export async function withdrawFromSubaccount({
  chainId,
  privateKey,
  mainAccountAddress,
  amount,
}: {
  chainId: number;
  privateKey: string;
  mainAccountAddress: string;
  amount: BigNumber;
}) {
  const provider = getProvider(undefined, chainId);
  const wallet = new ethers.Wallet(privateKey, provider);

  try {
    const signedTransaction = await wallet.sendTransaction({
      to: mainAccountAddress,
      value: amount,
      // FIXME
      gasLimit: BigNumber.from(21000),
    });

    // Wait for the transaction to be mined
    const receipt = await signedTransaction.wait();

    console.log("Transaction hash:", receipt.transactionHash);
    console.log("Gas used:", receipt.gasUsed.toString());

    return receipt;
  } catch (err) {
    console.log("FAIL", err);
  }
}
