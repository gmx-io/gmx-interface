import { useMemo } from "react";
import useSWR from "swr";

import { getContract } from "config/contracts";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import type { WalletSigner } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import type { ContractsChainId } from "sdk/configs/chains";

import { useGasPrice } from "../fees";
import { getClaimTransactionCallData } from "./createClaimTransaction";
import { ClaimableAmountsDataByDistributionId, ClaimsConfigurationData } from "./useUserClaimableAmounts";

export const useClaimExecutionFee = ({
  selectedDistributionIds,
  claimableAmountsDataByDistributionId,
  claimsConfigByDistributionId,
  chainId,
  signer,
  account,
  signatures,
}: {
  selectedDistributionIds: string[];
  claimableAmountsDataByDistributionId: ClaimableAmountsDataByDistributionId | undefined;
  claimsConfigByDistributionId: ClaimsConfigurationData | undefined;
  chainId: ContractsChainId;
  signer: WalletSigner | undefined;
  account: string | undefined;
  signatures: Record<string, string | undefined>;
}) => {
  const gasPrice = useGasPrice(chainId);

  const enabled = useMemo(() => {
    return (
      gasPrice !== undefined &&
      claimableAmountsDataByDistributionId !== undefined &&
      claimsConfigByDistributionId !== undefined &&
      signer !== undefined &&
      account !== undefined &&
      selectedDistributionIds.length > 0
    );
  }, [
    gasPrice,
    claimsConfigByDistributionId,
    claimableAmountsDataByDistributionId,
    signer,
    account,
    selectedDistributionIds.length,
  ]);

  return useSWR(enabled ? [account, selectedDistributionIds, chainId, signer] : null, {
    refreshInterval: undefined,
    fetcher: async () => {
      if (
        claimableAmountsDataByDistributionId === undefined ||
        claimsConfigByDistributionId === undefined ||
        signer === undefined ||
        account === undefined
      ) {
        return 0n;
      }

      const callData = getClaimTransactionCallData({
        selectedDistributionIds,
        claimableAmountsDataByDistributionId,
        claimsConfigByDistributionId,
        account,
        signatures,
      });

      const gasLimit = await getPublicClientWithRpc(chainId)
        .estimateGas({
          account: account,
          to: getContract(chainId, "ClaimHandler"),
          data: callData,
        })
        .then(applyGasLimitBuffer);

      return gasLimit * gasPrice!;
    },
  });
};
