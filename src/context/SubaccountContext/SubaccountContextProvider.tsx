import { t } from "@lingui/macro";
import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useCallback, useState } from "react";
import { toast } from "react-toastify";

import { getSubaccountApprovalKey, getSubaccountConfigKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { generateSubaccount } from "domain/synthetics/subaccount/generateSubaccount";
import { removeSubaccountTxn } from "domain/synthetics/subaccount/removeSubaccount";
import { Subaccount, SubaccountSerializedConfig } from "domain/synthetics/subaccount/types";
import { useSubaccountFromContractsRequest } from "domain/synthetics/subaccount/useSubaccountFromContractsRequest";
import {
  createAndSignSubaccountApproval,
  getActualApproval,
  getInitialSubaccountApprovalParams,
  getIsSubaccountActive,
  getMaxSubaccountActions,
  getRemainingSubaccountActions,
  getRemainingSubaccountSeconds,
  getSubaccountExpiresAt,
  getSubaccountSigner,
  SignedSubbacountApproval,
} from "domain/synthetics/subaccount/utils";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { metrics } from "lib/metrics";
import useWallet from "lib/wallets/useWallet";
import { DEFAULT_SUBACCOUNT_DEADLINE_DURATION } from "sdk/configs/express";
import { nowInSeconds } from "sdk/utils/time";

import { StatusNotification } from "components/Synthetics/StatusNotification/StatusNotification";
import { TransactionStatus } from "components/TransactionStatus/TransactionStatus";

export type SubaccountState = {
  subaccount: Subaccount | undefined;
  updateSubaccountSettings: (params: { nextRemainigActions?: bigint; nextRemainingSeconds?: bigint }) => Promise<void>;
  resetSubaccountApproval: () => void;
  tryEnableSubaccount: () => Promise<SubaccountSerializedConfig | undefined>;
  tryDisableSubaccount: () => Promise<void>;
  refreshSubaccountData: () => void;
};

const SubaccountContext = createContext<SubaccountState | undefined>(undefined);

export function useSubaccountContext() {
  const context = useContext(SubaccountContext);
  if (!context) {
    throw new Error("useSubaccount must be used within SubaccountContextProvider");
  }
  return context;
}

export function SubaccountContextProvider({ children }: { children: React.ReactNode }) {
  const { chainId } = useChainId();
  const { account, signer } = useWallet();
  const settings = useSettings();

  const [isTryingToEnableSubaccount, setIsTryingToEnableSubaccount] = useState(false);
  const [isTryingToSignDefaultSubaccountApproval, setIsTryingToSignDefaultSubaccountApproval] = useState(false);

  const {
    subaccountConfig,
    signedApproval,
    setSubaccountConfig,
    setSignedApproval,
    resetStoredApproval,
    resetStoredConfig,
  } = useStoredSubaccountData(chainId, account);

  const { subaccountData, refreshSubaccountData } = useSubaccountFromContractsRequest(chainId, {
    account,
    subaccountAddress: subaccountConfig?.address,
  });

  const subaccount: Subaccount | undefined = useMemo(() => {
    if (!subaccountConfig || !account || !subaccountData) {
      return undefined;
    }

    const subaccountSigner = getSubaccountSigner(subaccountConfig, account, signer?.provider);

    const result = {
      address: subaccountConfig.address,
      signer: subaccountSigner,
      signedApproval,
      onchainData: subaccountData,
      optimisticActive: getIsSubaccountActive({
        onchainData: subaccountData,
        signedApproval,
      }),
      optimisticMaxAllowedCount: getMaxSubaccountActions({
        signedApproval,
        onchainData: subaccountData,
      }),
      optimisticExpiresAt: getSubaccountExpiresAt({
        signedApproval,
        onchainData: subaccountData,
      }),
    };

    result.signedApproval = getActualApproval(result);

    return result;
  }, [account, signedApproval, signer?.provider, subaccountConfig, subaccountData]);

  const updateSubaccountSettings = useCallback(
    async function updateSubaccountSettings({
      nextRemainigActions,
      nextRemainingSeconds,
    }: {
      nextRemainigActions?: bigint;
      nextRemainingSeconds?: bigint;
    }) {
      if (!signer || !subaccount?.address) {
        return;
      }

      const oldMaxAllowedCount = subaccount.optimisticMaxAllowedCount;
      const oldRemainingActions = getRemainingSubaccountActions(subaccount);

      let nextMaxAllowedCount = oldMaxAllowedCount;

      if (nextRemainigActions !== undefined) {
        nextMaxAllowedCount = oldMaxAllowedCount + nextRemainigActions - oldRemainingActions;
      }

      const oldExpiresAt = subaccount.optimisticExpiresAt;
      const oldRemainingSeconds = getRemainingSubaccountSeconds(subaccount);

      let nextExpiresAt = oldExpiresAt;

      if (nextRemainingSeconds !== undefined) {
        nextExpiresAt = oldExpiresAt + nextRemainingSeconds - oldRemainingSeconds;
      }

      toast.dismiss();

      helperToast.success(
        <StatusNotification title={t`Updating subaccount settings`}>
          <TransactionStatus status="loading" text={t`Updating subaccount settings...`} />
        </StatusNotification>
      );

      const signedSubaccountApproval = await createAndSignSubaccountApproval(
        chainId,
        signer,
        subaccount.address,
        subaccount.onchainData.approvalNonce,
        {
          deadline: BigInt(nowInSeconds() + DEFAULT_SUBACCOUNT_DEADLINE_DURATION),
          expiresAt: nextExpiresAt,
          maxAllowedCount: nextMaxAllowedCount,
          shouldAdd: !subaccount.onchainData.active,
        }
      ).catch((error) => {
        helperToast.error(
          <StatusNotification title={t`Updating subaccount settings`}>
            <TransactionStatus status="error" text={t`Failed to update subaccount settings`} />
          </StatusNotification>
        );
        throw error;
      });

      if (signedSubaccountApproval) {
        helperToast.success(
          <StatusNotification title={t`Updating subaccount settings`}>
            <TransactionStatus status="success" text={t`Subaccount settings updated`} />
          </StatusNotification>
        );
        setSignedApproval(signedSubaccountApproval);
      }
    },
    [signer, subaccount, chainId, setSignedApproval]
  );

  const resetSubaccountApproval = useCallback(() => {
    setSignedApproval(undefined);
    refreshSubaccountData();
  }, [refreshSubaccountData, setSignedApproval]);

  const trySignDefaultSubaccountApproval = useCallback(async () => {
    if (!signer || !subaccountConfig?.address || !subaccountData) {
      return;
    }

    setIsTryingToSignDefaultSubaccountApproval(true);

    toast.dismiss();

    helperToast.success(
      <StatusNotification title={t`Signing subaccount approval`}>
        <TransactionStatus status="loading" text={t`Signing subaccount approval...`} />
      </StatusNotification>
    );

    try {
      const initialParams = getInitialSubaccountApprovalParams({ onchainData: subaccountData });

      const defaultSubaccountApproval = await createAndSignSubaccountApproval(
        chainId,
        signer,
        subaccountConfig.address,
        subaccountData.approvalNonce,
        {
          shouldAdd: !subaccountData.active,
          expiresAt: initialParams.expiresAt,
          maxAllowedCount: initialParams.maxAllowedCount,
          deadline: initialParams.deadline,
        }
      );

      toast.dismiss();
      helperToast.success(
        <StatusNotification title={t`Signing subaccount approval`}>
          <TransactionStatus status="success" text={t`Subaccount approval signed`} />
        </StatusNotification>
      );

      if (!settings.expressOrdersEnabled) {
        settings.setExpressOrdersEnabled(true);
      }

      setSignedApproval(defaultSubaccountApproval);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      metrics.pushError(error, "subaccount.signDefaultSubaccountApproval");
      resetStoredConfig();
      toast.dismiss();
      helperToast.error(
        <StatusNotification title={t`Signing default subaccount approval`}>
          <TransactionStatus status="error" text={t`Failed to sign default subaccount approval`} />
        </StatusNotification>
      );
    } finally {
      setIsTryingToSignDefaultSubaccountApproval(false);
      setIsTryingToEnableSubaccount(false);
    }
  }, [signer, subaccountConfig?.address, subaccountData, chainId, settings, setSignedApproval, resetStoredConfig]);

  const tryEnableSubaccount = useCallback(async () => {
    if (!signer) {
      return;
    }

    if (subaccountConfig?.address && !signedApproval) {
      setIsTryingToEnableSubaccount(true);
      refreshSubaccountData();
      return;
    }

    settings.setOneClickTradingEnabled(true);

    try {
      let config = subaccountConfig;

      if (!config?.address) {
        toast.dismiss();

        helperToast.success(
          <StatusNotification title={t`Generating subaccount...`}>
            <TransactionStatus status="loading" text={t`Generating subaccount...`} />
          </StatusNotification>
        );

        config = await generateSubaccount(signer)
          .then((res) => {
            toast.dismiss();
            helperToast.success(
              <StatusNotification title={t`Generating subaccount...`}>
                <TransactionStatus status="success" text={t`Subaccount generated`} />
              </StatusNotification>
            );
            return res;
          })
          .catch((error) => {
            toast.dismiss();
            helperToast.error(
              <StatusNotification title={t`Generating subaccount approval`}>
                <TransactionStatus status="error" text={t`Failed to generate subaccount`} />
              </StatusNotification>
            );
            throw error;
          });

        await refreshSubaccountData();
        setSubaccountConfig(config);
        setIsTryingToEnableSubaccount(true);
        return config;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      metrics.pushError(error, "subaccount.tryEnableSubaccount");
      settings.setOneClickTradingEnabled(false);
      return undefined;
    }
  }, [signer, subaccountConfig, signedApproval, settings, refreshSubaccountData, setSubaccountConfig]);

  const tryDisableSubaccount = useCallback(async () => {
    if (!signer || !subaccount?.address) {
      return;
    }

    toast.dismiss();

    helperToast.success(
      <StatusNotification title={t`Deactivating subaccount`}>
        <TransactionStatus status="loading" text={t`Deactivating subaccount...`} />
      </StatusNotification>
    );

    await removeSubaccountTxn(chainId, signer, subaccount.address)
      .then(() => {
        helperToast.success(
          <StatusNotification title={t`Deactivating subaccount`}>
            <TransactionStatus status="success" text={t`Subaccount deactivated`} />
          </StatusNotification>
        );
      })
      .catch((error) => {
        metrics.pushError(error, "subaccount.tryDisableSubaccount");
        helperToast.error(
          <StatusNotification title={t`Deactivating subaccount`}>
            <TransactionStatus status="error" text={t`Failed to deactivate subaccount`} />
          </StatusNotification>
        );
        throw error;
      });

    resetStoredApproval();
    resetStoredConfig();
    refreshSubaccountData();
    settings.setOneClickTradingEnabled(false);
  }, [signer, subaccount, chainId, resetStoredApproval, resetStoredConfig, refreshSubaccountData, settings]);

  useEffect(() => {
    if (isTryingToEnableSubaccount && !isTryingToSignDefaultSubaccountApproval) {
      trySignDefaultSubaccountApproval();
    }
  }, [isTryingToEnableSubaccount, isTryingToSignDefaultSubaccountApproval, trySignDefaultSubaccountApproval]);

  const state: SubaccountState = useMemo(() => {
    return {
      subaccount,
      updateSubaccountSettings,
      resetSubaccountApproval,
      tryEnableSubaccount,
      tryDisableSubaccount,
      refreshSubaccountData,
    };
  }, [
    subaccount,
    updateSubaccountSettings,
    resetSubaccountApproval,
    tryEnableSubaccount,
    tryDisableSubaccount,
    refreshSubaccountData,
  ]);

  return <SubaccountContext.Provider value={state}>{children}</SubaccountContext.Provider>;
}

function useStoredSubaccountData(chainId: number, account: string | undefined) {
  const [subaccountConfig, setSubaccountConfig] = useLocalStorageSerializeKey<SubaccountSerializedConfig | undefined>(
    getSubaccountConfigKey(chainId, account),
    undefined,
    {
      raw: false,
      serializer: (val) => {
        if (!val) {
          return "";
        }

        return JSON.stringify(val);
      },
      deserializer: (stored) => {
        if (!stored) {
          return undefined;
        }

        try {
          const parsed = JSON.parse(stored);
          return parsed;
        } catch (e) {
          return undefined;
        }
      },
    }
  );

  const [signedApproval, setSignedApproval] = useLocalStorageSerializeKey<SignedSubbacountApproval | undefined>(
    getSubaccountApprovalKey(chainId),
    undefined,
    {
      raw: false,
      serializer: (val) => {
        if (!val) {
          return "";
        }

        return JSON.stringify(val);
      },
      deserializer: (stored) => {
        if (!stored) {
          return undefined;
        }

        try {
          const parsed = JSON.parse(stored);
          return {
            ...parsed,
            maxAllowedCount: BigInt(parsed.maxAllowedCount),
            expiresAt: BigInt(parsed.expiresAt),
            deadline: BigInt(parsed.deadline),
            nonce: BigInt(parsed.nonce),
          };
        } catch (e) {
          return undefined;
        }
      },
    }
  );

  return useMemo(() => {
    function resetStoredApproval() {
      setSignedApproval(null as any);
    }

    function resetStoredConfig() {
      setSubaccountConfig(null as any);
    }

    return {
      subaccountConfig,
      signedApproval,
      setSubaccountConfig,
      setSignedApproval,
      resetStoredApproval,
      resetStoredConfig,
    };
  }, [subaccountConfig, signedApproval, setSubaccountConfig, setSignedApproval]);
}
