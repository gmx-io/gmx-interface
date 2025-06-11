import { t } from "@lingui/macro";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import { getSubaccountApprovalKey, getSubaccountConfigKey } from "config/localStorage";
import { generateSubaccount } from "domain/synthetics/subaccount/generateSubaccount";
import { removeSubaccountTxn } from "domain/synthetics/subaccount/removeSubaccount";
import { SignedSubbacountApproval, Subaccount, SubaccountSerializedConfig } from "domain/synthetics/subaccount/types";
import { useSubaccountOnchainData } from "domain/synthetics/subaccount/useSubaccountOnchainData";
import {
  getActualApproval,
  getInitialSubaccountApproval,
  getIsSubaccountActive,
  getSubaccountSigner,
  signUpdatedSubaccountSettings,
} from "domain/synthetics/subaccount/utils";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { metrics } from "lib/metrics";
import useWallet from "lib/wallets/useWallet";

import { StatusNotification } from "components/Synthetics/StatusNotification/StatusNotification";
import { TransactionStatus, TransactionStatusType } from "components/TransactionStatus/TransactionStatus";

enum SubaccountActivationState {
  Generating = 0,
  GeneratingError = 1,
  ApprovalSigning = 2,
  ApprovalSigningError = 3,
  Success = 4,
}

enum SubaccountDeactivationState {
  Deactivating = 0,
  Error = 1,
  Success = 2,
}

export type SubaccountState = {
  subaccountConfig: SubaccountSerializedConfig | undefined;
  subaccount: Subaccount | undefined;
  subaccountActivationState: SubaccountActivationState | undefined;
  subaccountDeactivationState: SubaccountDeactivationState | undefined;
  updateSubaccountSettings: (params: { nextRemainigActions?: bigint; nextRemainingSeconds?: bigint }) => Promise<void>;
  resetSubaccountApproval: () => void;
  tryEnableSubaccount: () => Promise<boolean>;
  tryDisableSubaccount: () => Promise<boolean>;
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
  const { signer } = useWallet();

  const {
    subaccountConfig,
    signedApproval,
    setSubaccountConfig,
    setSignedApproval,
    resetStoredApproval,
    resetStoredConfig,
  } = useStoredSubaccountData(chainId, signer?.address);

  const [subaccountActivationState, setSubaccountActivationState] = useState<SubaccountActivationState | undefined>(
    undefined
  );

  const [subaccountDeactivationState, setSubaccountDeactivationState] = useState<
    SubaccountDeactivationState | undefined
  >(undefined);

  const { subaccountData, refreshSubaccountData } = useSubaccountOnchainData(chainId, {
    account: signer?.address,
    subaccountAddress: subaccountConfig?.address,
  });

  const subaccount: Subaccount | undefined = useMemo(() => {
    if (!subaccountConfig?.isNew || !signer?.address || !subaccountData || !signer?.provider) {
      return undefined;
    }

    const subaccountSigner = getSubaccountSigner(subaccountConfig, signer?.address, signer?.provider);

    const composedSubbacount: Subaccount = {
      address: subaccountConfig.address,
      signer: subaccountSigner,
      onchainData: subaccountData,
      signedApproval: getActualApproval({
        address: subaccountConfig.address,
        onchainData: subaccountData,
        signedApproval,
      }),
    };

    if (!getIsSubaccountActive(composedSubbacount)) {
      return undefined;
    }

    return composedSubbacount;
  }, [signedApproval, signer?.address, signer?.provider, subaccountConfig, subaccountData]);

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

      helperToast.success(
        <StatusNotification key="updateSubaccountSettings" title={t`Update 1CT (One-Click Trading) settings`}>
          <TransactionStatus status="loading" text={t`Updating settings...`} />
        </StatusNotification>
      );

      try {
        const signedSubaccountApproval = await signUpdatedSubaccountSettings({
          chainId,
          signer,
          subaccount,
          nextRemainigActions,
          nextRemainingSeconds,
        });

        helperToast.success(
          <StatusNotification key="updateSubaccountSettingsSuccess" title={t`Update 1CT (One-Click Trading) settings`}>
            <TransactionStatus status="success" text={t`settings updated`} />
          </StatusNotification>
        );
        setSignedApproval(signedSubaccountApproval);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        metrics.pushError(error, "subaccount.updateSubaccountSettings");
        toast.dismiss();
        helperToast.error(
          <StatusNotification key="updateSubaccountSettingsError" title={t`Update 1CT (One-Click Trading) settings`}>
            <TransactionStatus status="error" text={t`Failed to update settings`} />
          </StatusNotification>
        );
      }
    },
    [signer, subaccount, chainId, setSignedApproval]
  );

  const resetSubaccountApproval = useCallback(() => {
    setSignedApproval(undefined);
    refreshSubaccountData();
  }, [refreshSubaccountData, setSignedApproval]);

  const tryEnableSubaccount = useCallback(async () => {
    if (!signer?.provider) {
      return false;
    }

    let config = subaccountConfig;

    const toastId = Date.now();

    helperToast.success(<SubaccountActivateNotification toastId={toastId} />, {
      autoClose: false,
      toastId,
    });

    if (!config?.address) {
      try {
        setSubaccountActivationState(SubaccountActivationState.Generating);
        config = await generateSubaccount(signer);

        setSubaccountConfig(config);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);

        setSubaccountActivationState(SubaccountActivationState.GeneratingError);
        metrics.pushError(error, "subaccount.generateSubaccount");
        return false;
      }
    }

    if (!config.address) {
      const error = "Missed subaccount config";
      // eslint-disable-next-line no-console
      console.error(error);
      setSubaccountActivationState(SubaccountActivationState.GeneratingError);

      metrics.pushError(error, "subaccount.missedSubaccountConfigAfterGeneration");
      resetStoredConfig();
      return false;
    }

    try {
      setSubaccountActivationState(SubaccountActivationState.ApprovalSigning);

      const defaultSubaccountApproval = await getInitialSubaccountApproval({
        chainId,
        signer,
        provider: signer?.provider,
        subaccountAddress: config!.address,
      });

      setSubaccountActivationState(SubaccountActivationState.Success);

      setSignedApproval(defaultSubaccountApproval);

      if (!config.isNew) {
        setSubaccountConfig({ ...config, isNew: true });
      }

      return true;
    } catch (error) {
      setSubaccountActivationState(SubaccountActivationState.ApprovalSigningError);
      // eslint-disable-next-line no-console
      console.error(error);
      metrics.pushError(error, "subaccount.signDefaultApproval");
      return false;
    }
  }, [signer, subaccountConfig, setSubaccountConfig, resetStoredConfig, chainId, setSignedApproval]);

  const tryDisableSubaccount = useCallback(async () => {
    if (!signer || !subaccount?.address) {
      return false;
    }

    const toastId = Date.now();

    helperToast.success(<SubaccountDeactivateNotification toastId={toastId} />, {
      autoClose: false,
      toastId,
    });

    setSubaccountDeactivationState(SubaccountDeactivationState.Deactivating);

    try {
      await removeSubaccountTxn(chainId, signer, subaccount.address);

      setSubaccountDeactivationState(SubaccountDeactivationState.Success);

      resetStoredApproval();
      resetStoredConfig();
      refreshSubaccountData();
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      metrics.pushError(error, "subaccount.tryDisableSubaccount");
      setSubaccountDeactivationState(SubaccountDeactivationState.Error);
      return false;
    }
  }, [signer, subaccount, chainId, resetStoredApproval, resetStoredConfig, refreshSubaccountData]);

  useEffect(
    function notifySubaccountActivation() {
      if (subaccount) {
        refreshSubaccountData();
      }
    },
    [subaccount, refreshSubaccountData]
  );

  const state: SubaccountState = useMemo(() => {
    return {
      subaccountConfig,
      subaccount,
      subaccountActivationState,
      subaccountDeactivationState,
      updateSubaccountSettings,
      resetSubaccountApproval,
      tryEnableSubaccount,
      tryDisableSubaccount,
      refreshSubaccountData,
    };
  }, [
    subaccountConfig,
    subaccount,
    subaccountActivationState,
    subaccountDeactivationState,
    updateSubaccountSettings,
    resetSubaccountApproval,
    tryEnableSubaccount,
    tryDisableSubaccount,
    refreshSubaccountData,
  ]);

  return <SubaccountContext.Provider value={state}>{children}</SubaccountContext.Provider>;
}

function SubaccountActivateNotification({ toastId }: { toastId: number }) {
  const { subaccountActivationState } = useSubaccountContext();

  const dismissTimerId = useRef<NodeJS.Timeout | undefined>(undefined);

  const hasError =
    subaccountActivationState === SubaccountActivationState.GeneratingError ||
    subaccountActivationState === SubaccountActivationState.ApprovalSigningError;

  const isCompleted = subaccountActivationState === SubaccountActivationState.Success || hasError;

  const generatingStatus = useMemo(() => {
    let text = t`Generating session...`;
    let status: TransactionStatusType = "loading";
    let statusText: ReactNode | undefined;

    if (subaccountActivationState === SubaccountActivationState.GeneratingError) {
      status = "error";
      text = t`Failed to generate session`;
    } else if (subaccountActivationState && subaccountActivationState >= SubaccountActivationState.ApprovalSigning) {
      status = "success";
      text = t`Session generated`;
    }

    return <TransactionStatus status={status} text={text} statusText={statusText} />;
  }, [subaccountActivationState]);

  const approvalSigningStatus = useMemo(() => {
    let status: TransactionStatusType = "muted";
    let text = t`Signing approval...`;
    let statusText: ReactNode | undefined;

    if (subaccountActivationState === SubaccountActivationState.ApprovalSigning) {
      status = "loading";
    } else if (subaccountActivationState === SubaccountActivationState.ApprovalSigningError) {
      status = "error";
      text = t`Failed to sign approval`;
    } else if (subaccountActivationState === SubaccountActivationState.Success) {
      status = "success";
      text = t`Approval signed`;
    }

    return <TransactionStatus status={status} text={text} statusText={statusText} />;
  }, [subaccountActivationState]);

  useEffect(
    function cleanup() {
      if (isCompleted && !dismissTimerId.current) {
        dismissTimerId.current = setTimeout(() => {
          toast.dismiss(toastId);
          dismissTimerId.current = undefined;
        }, 5000);
      }

      return () => {
        if (dismissTimerId.current) {
          clearTimeout(dismissTimerId.current);
        }
      };
    },
    [isCompleted, subaccountActivationState, toastId]
  );

  return (
    <StatusNotification
      key="updateSubaccountSettingsSuccess"
      title={t`Activate 1CT (One-Click Trading)`}
      hasError={hasError}
    >
      {generatingStatus}
      {approvalSigningStatus}
    </StatusNotification>
  );
}

function SubaccountDeactivateNotification({ toastId }: { toastId: number }) {
  const { subaccountDeactivationState } = useSubaccountContext();

  const dismissTimerId = useRef<NodeJS.Timeout | undefined>(undefined);

  const hasError = subaccountDeactivationState === SubaccountDeactivationState.Error;
  const isCompleted =
    subaccountDeactivationState === SubaccountDeactivationState.Success ||
    subaccountDeactivationState === SubaccountDeactivationState.Error;

  const deactivatingStatus = useMemo(() => {
    let text = t`Deactivating...`;
    let status: TransactionStatusType = "loading";
    let statusText: ReactNode | undefined;

    if (subaccountDeactivationState === SubaccountDeactivationState.Error) {
      status = "error";
      text = t`Failed to deactivate`;
    } else if (subaccountDeactivationState === SubaccountDeactivationState.Success) {
      status = "success";
      text = t`Deactivated`;
    }

    return <TransactionStatus status={status} text={text} statusText={statusText} />;
  }, [subaccountDeactivationState]);

  useEffect(
    function cleanup() {
      if (isCompleted && !dismissTimerId.current) {
        dismissTimerId.current = setTimeout(() => {
          toast.dismiss(toastId);
          dismissTimerId.current = undefined;
        }, 5000);
      }

      return () => {
        if (dismissTimerId.current) {
          clearTimeout(dismissTimerId.current);
        }
      };
    },
    [isCompleted, subaccountDeactivationState, toastId]
  );

  return (
    <StatusNotification title={t`Deactivate 1CT (One-Click Trading)`} hasError={hasError}>
      {deactivatingStatus}
    </StatusNotification>
  );
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

          if (!parsed.address || !parsed.privateKey) {
            return undefined;
          }

          return parsed;
        } catch (e) {
          return undefined;
        }
      },
    }
  );

  const [signedApproval, setSignedApproval] = useLocalStorageSerializeKey<SignedSubbacountApproval | undefined>(
    getSubaccountApprovalKey(chainId, account),
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
