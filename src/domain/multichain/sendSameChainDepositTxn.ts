import { Contract } from "ethers";
import { encodeFunctionData, zeroAddress } from "viem";

import type { SettlementChainId } from "config/chains";
import { getContract } from "config/contracts";
import { TxnCallback, WalletTxnCtx, sendWalletTransaction } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import { abis } from "sdk/abis";
import { getToken } from "sdk/configs/tokens";

export async function sendSameChainDepositTxn({
  chainId,
  signer,
  tokenAddress,
  amount,
  account,
  callback,
}: {
  chainId: SettlementChainId;
  signer: WalletSigner;
  tokenAddress: string;
  amount: bigint;
  account: string;
  callback?: TxnCallback<WalletTxnCtx>;
}) {
  const multichainVaultAddress = getContract(chainId, "MultichainVault");

  const contract = new Contract(
    getContract(chainId, "MultichainTransferRouter"),
    abis.MultichainTransferRouter,
    signer
  );

  if (tokenAddress === zeroAddress) {
    const token = getToken(chainId, tokenAddress);
    const wrappedAddress = token?.wrappedAddress;

    if (!wrappedAddress) {
      throw new Error("Wrapped address is not set");
    }

    await sendWalletTransaction({
      chainId: chainId,
      signer: signer,
      to: await contract.getAddress(),
      callData: contract.interface.encodeFunctionData("multicall", [
        [
          encodeFunctionData({
            abi: abis.MultichainTransferRouter,
            functionName: "sendWnt",
            args: [multichainVaultAddress, amount],
          }),
          encodeFunctionData({
            abi: abis.MultichainTransferRouter,
            functionName: "bridgeIn",
            args: [account, wrappedAddress],
          }),
        ],
      ]),
      value: amount,
      callback,
    });
  } else {
    await sendWalletTransaction({
      chainId: chainId,
      signer: signer,
      to: await contract.getAddress(),
      callData: contract.interface.encodeFunctionData("multicall", [
        [
          encodeFunctionData({
            abi: abis.MultichainTransferRouter,
            functionName: "sendTokens",
            args: [tokenAddress, multichainVaultAddress, amount],
          }),

          encodeFunctionData({
            abi: abis.MultichainTransferRouter,
            functionName: "bridgeIn",
            args: [account, tokenAddress],
          }),
        ],
      ]),
      callback,
    });
  }
}
