import { useMemo } from "react";
import useSWR from "swr";

import { getContract } from "config/contracts";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import type { WalletSigner } from "lib/wallets";
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
    if (
      gasPrice === undefined ||
      claimableAmountsDataByDistributionId === undefined ||
      claimsConfigByDistributionId === undefined ||
      signer === undefined ||
      account === undefined ||
      selectedDistributionIds.length === 0
    ) {
      return false;
    }

    return selectedDistributionIds.every((distributionId) => {
      if (claimsConfigByDistributionId[distributionId]?.claimTerms) {
        return signatures[distributionId] !== undefined;
      }

      return true;
    });
  }, [
    signatures,
    selectedDistributionIds,
    gasPrice,
    claimsConfigByDistributionId,
    claimableAmountsDataByDistributionId,
    signer,
    account,
  ]);

  return useSWR(enabled ? [account, selectedDistributionIds, chainId, signer] : null, {
    refreshInterval: undefined,
    fetcher: async () => {
      if (claimableAmountsDataByDistributionId === undefined || signer === undefined || account === undefined) {
        return 0n;
      }

      const callData = getClaimTransactionCallData({
        selectedDistributionIds,
        claimableAmountsDataByDistributionId,
        account,
        signatures,
      });

      const gasLimit = await estimateGasLimit(signer!.provider!, {
        to: getContract(chainId, "ClaimHandler"),
        data: callData,
        from: account!,
        value: undefined,
      });

      return gasLimit * gasPrice!;
    },
  });
};
