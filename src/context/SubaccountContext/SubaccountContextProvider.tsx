import { t } from "@lingui/macro";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "react-toastify";

import type { ContractsChainId, SourceChainId } from "config/chains";
import { getSubaccountApprovalKey, getSubaccountConfigKey } from "config/localStorage";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectTradeboxIsFromTokenGmxAccount } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useCalcSelector } from "context/SyntheticsStateContext/utils";
import { removeSubaccountExpressTxn, removeSubaccountWalletTxn } from "domain/synthetics/subaccount";
import type { SignedSubaccountApproval, Subaccount, SubaccountSerializedConfig } from "domain/synthetics/subaccount";
import { generateSubaccount } from "domain/synthetics/subaccount/generateSubaccount";
import {
  deserializeSubaccountApproval,
  findFallbackSubaccountApproval,
  migrateLegacySubaccountApprovalSlot,
  removeAllStoredSubaccountApprovals,
  serializeSubaccountApproval,
  writeStoredSubaccountApproval,
} from "domain/synthetics/subaccount/subaccountApprovalStorage";
import { useSubaccountOnchainData } from "domain/synthetics/subaccount/useSubaccountOnchainData";
import {
  getActualApproval,
  getInitialSubaccountApproval,
  getIsSubaccountActive,
  getSubaccountApprovalContextSrcChainId,
  getSubaccountSigner,
  signUpdatedSubaccountSettings,
} from "domain/synthetics/subaccount/utils";
import { useChainId } from "lib/chains";
import { type ErrorLike, parseError, TxErrorType } from "lib/errors";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { metrics } from "lib/metrics";
import { useJsonRpcProvider } from "lib/rpc";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import useWallet from "lib/wallets/useWallet";
import { getNativeToken } from "sdk/configs/tokens";
import { ExpressEstimationInsufficientGasPaymentTokenBalanceError } from "sdk/utils/express";

import { StatusNotification } from "components/StatusNotification/StatusNotification";
import { TransactionStatus, TransactionStatusType } from "components/TransactionStatus/TransactionStatus";

enum SubaccountActivationState {
  Generating = 0,
  GeneratingError = 1,
  ApprovalSigning = 2,
  ApprovalSigningError = 3,
  Success = 4,
}

export enum SubaccountDeactivationState {
  Deactivating = 0,
  Error = 1,
  Success = 2,
}

export enum SubaccountDeactivationFailureReason {
  Rejected = "rejected",
  InsufficientGasPaymentTokenBalance = "insufficientGasPaymentTokenBalance",
  InsufficientNativeTokenBalance = "insufficientNativeTokenBalance",
  ExpressParamsNotReady = "expressParamsNotReady",
  Unknown = "unknown",
}

function getSubaccountDeactivationFailureReason(
  error: unknown,
  isExpressPath: boolean
): SubaccountDeactivationFailureReason {
  if (error instanceof ExpressEstimationInsufficientGasPaymentTokenBalanceError) {
    return SubaccountDeactivationFailureReason.InsufficientGasPaymentTokenBalance;
  }

  const errorData = parseError(error as ErrorLike);

  if (errorData?.isUserRejectedError) {
    return SubaccountDeactivationFailureReason.Rejected;
  }

  if (
    errorData?.contractError === "InsufficientMultichainBalance" ||
    errorData?.contractError === "InsufficientRelayFee" ||
    errorData?.contractError === "InsufficientFunds"
  ) {
    return SubaccountDeactivationFailureReason.InsufficientGasPaymentTokenBalance;
  }

  if (errorData?.txErrorType === TxErrorType.NotEnoughFunds) {
    return isExpressPath
      ? SubaccountDeactivationFailureReason.InsufficientGasPaymentTokenBalance
      : SubaccountDeactivationFailureReason.InsufficientNativeTokenBalance;
  }

  return SubaccountDeactivationFailureReason.Unknown;
}

export type SubaccountState = {
  subaccountConfig: SubaccountSerializedConfig | undefined;
  subaccount: Subaccount | undefined;
  subaccountActivationState: SubaccountActivationState | undefined;
  subaccountDeactivationState: SubaccountDeactivationState | undefined;
  subaccountDeactivationFailureReason: SubaccountDeactivationFailureReason | undefined;
  updateSubaccountSettings: (params: {
    nextRemainigActions?: bigint;
    nextRemainingSeconds?: bigint;
    nextIsGmxAccount?: boolean;
  }) => Promise<boolean>;
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
  const { chainId, srcChainId } = useChainId();
  const signer = useEthersSigner();
  const { account } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);

  const {
    subaccountConfig,
    signedApproval,
    fallbackSignedApproval,
    setSubaccountConfig,
    setSignedApproval,
    resetStoredApproval,
    resetStoredConfig,
  } = useStoredSubaccountData(chainId, srcChainId, signer?.address);

  const [subaccountActivationState, setSubaccountActivationState] = useState<SubaccountActivationState | undefined>(
    undefined
  );

  const [subaccountDeactivationState, setSubaccountDeactivationState] = useState<
    SubaccountDeactivationState | undefined
  >(undefined);

  const [subaccountDeactivationFailureReason, setSubaccountDeactivationFailureReason] = useState<
    SubaccountDeactivationFailureReason | undefined
  >(undefined);

  const { subaccountData, refreshSubaccountData } = useSubaccountOnchainData(chainId, {
    account: signer?.address,
    subaccountAddress: subaccountConfig?.address,
    srcChainId,
  });

  const subaccount: Subaccount | undefined = useMemo(() => {
    if (!subaccountConfig?.isNew || !signer?.address || !subaccountData || !signer?.provider) {
      return undefined;
    }

    const subaccountSigner = getSubaccountSigner(subaccountConfig, signer?.address, signer?.provider);

    const contextSignedApproval = signedApproval ?? (subaccountData.active ? undefined : fallbackSignedApproval);

    const composedSubacсount: Subaccount = {
      address: subaccountConfig.address,
      signer: subaccountSigner,
      onchainData: subaccountData,
      signedApproval: getActualApproval({
        chainId,
        address: subaccountConfig.address,
        onchainData: subaccountData,
        signedApproval: contextSignedApproval,
      }),
      chainId,
      signerChainId: srcChainId ?? chainId,
    };

    if (!getIsSubaccountActive(composedSubacсount)) {
      return undefined;
    }

    return composedSubacсount;
  }, [
    chainId,
    fallbackSignedApproval,
    signedApproval,
    signer?.address,
    signer?.provider,
    srcChainId,
    subaccountConfig,
    subaccountData,
  ]);

  const calcSelector = useCalcSelector();

  const updateSubaccountSettings = useCallback(
    async function updateSubaccountSettings({
      nextRemainigActions,
      nextRemainingSeconds,
      nextIsGmxAccount,
    }: {
      nextRemainigActions?: bigint;
      nextRemainingSeconds?: bigint;
      nextIsGmxAccount?: boolean;
    }): Promise<boolean> {
      if (!signer || !subaccount?.address || !provider) {
        return false;
      }

      helperToast.info(
        <StatusNotification key="updateSubaccountSettings" title={t`Update 1CT settings`}>
          <TransactionStatus status="loading" text={t`Updating settings...`} />
        </StatusNotification>
      );

      const isGmxAccount = nextIsGmxAccount ?? calcSelector(selectTradeboxIsFromTokenGmxAccount);

      try {
        const signedSubaccountApproval = await signUpdatedSubaccountSettings({
          chainId,
          signer,
          provider,
          subaccount,
          nextRemainigActions,
          nextRemainingSeconds,
          isGmxAccount,
        });

        helperToast.success(
          <StatusNotification key="updateSubaccountSettingsSuccess" title={t`Update 1CT settings`}>
            <TransactionStatus status="success" text={t`Settings updated`} />
          </StatusNotification>
        );
        setSignedApproval(signedSubaccountApproval);
        return true;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        metrics.pushError(error, "subaccount.updateSubaccountSettings");
        toast.dismiss();
        helperToast.error(
          <StatusNotification key="updateSubaccountSettingsError" title={t`Update 1CT settings`}>
            <TransactionStatus status="error" text={t`Settings update failed`} />
          </StatusNotification>
        );
        return false;
      }
    },
    [signer, subaccount, provider, calcSelector, chainId, setSignedApproval]
  );

  const resetSubaccountApproval = useCallback(() => {
    resetStoredApproval();
    refreshSubaccountData();
  }, [refreshSubaccountData, resetStoredApproval]);

  const tryEnableSubaccount = useCallback(async () => {
    if (!provider || !signer) {
      return false;
    }

    let config = subaccountConfig;

    const toastId = Date.now();

    helperToast.info(<SubaccountActivateNotification toastId={toastId} />, {
      autoClose: false,
      toastId,
    });

    let isConfigGeneratedInCurrentFlow = false;

    if (!config?.address) {
      try {
        setSubaccountActivationState(SubaccountActivationState.Generating);
        config = await generateSubaccount(signer);
        isConfigGeneratedInCurrentFlow = true;

        setSubaccountConfig(config);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);

        setSubaccountActivationState(SubaccountActivationState.GeneratingError);
        metrics.pushError(error, "subaccount.generateSubaccount");
        return false;
      }
    }

    if (!config?.address) {
      const error = "Missed subaccount config";
      // eslint-disable-next-line no-console
      console.error(error);
      setSubaccountActivationState(SubaccountActivationState.GeneratingError);

      metrics.pushError(error, "subaccount.missedSubaccountConfigAfterGeneration");
      resetStoredConfig();
      return false;
    }

    const isGmxAccount = calcSelector(selectTradeboxIsFromTokenGmxAccount);

    try {
      setSubaccountActivationState(SubaccountActivationState.ApprovalSigning);

      const defaultSubaccountApproval = await getInitialSubaccountApproval({
        chainId,
        signer,
        provider,
        subaccountAddress: config!.address,
        isGmxAccount,
      });

      setSubaccountActivationState(SubaccountActivationState.Success);

      setSignedApproval(defaultSubaccountApproval);

      if (!config.isNew) {
        setSubaccountConfig({ ...config, isNew: true });
      }

      return true;
    } catch (error) {
      if (isConfigGeneratedInCurrentFlow) {
        resetStoredConfig();
      }

      setSubaccountActivationState(SubaccountActivationState.ApprovalSigningError);
      // eslint-disable-next-line no-console
      console.error(error);
      metrics.pushError(error, "subaccount.signDefaultApproval");
      return false;
    }
  }, [
    provider,
    signer,
    subaccountConfig,
    calcSelector,
    setSubaccountConfig,
    resetStoredConfig,
    chainId,
    setSignedApproval,
  ]);

  const tryDisableSubaccount = useCallback(async (): Promise<boolean> => {
    if (!signer || !subaccount?.address || !account) {
      return false;
    }

    const toastId = Date.now();

    helperToast.info(<SubaccountDeactivateNotification toastId={toastId} />, {
      autoClose: false,
      toastId,
    });

    setSubaccountDeactivationFailureReason(undefined);
    setSubaccountDeactivationState(SubaccountDeactivationState.Deactivating);

    try {
      if (srcChainId !== undefined) {
        const globalExpressParams = calcSelector(selectExpressGlobalParams);

        if (!provider || !globalExpressParams) {
          metrics.pushError(
            new Error("Missing provider or globalExpressParams for subaccount deactivation"),
            "subaccount.tryDisableSubaccount"
          );
          setSubaccountDeactivationFailureReason(SubaccountDeactivationFailureReason.ExpressParamsNotReady);
          setSubaccountDeactivationState(SubaccountDeactivationState.Error);
          return false;
        }

        await removeSubaccountExpressTxn({
          chainId,
          provider,
          account,
          srcChainId,
          signer,
          subaccount,
          globalExpressParams,
          cachedOnchainActive: subaccount.onchainData.active,
        });
      } else {
        await removeSubaccountWalletTxn(chainId, signer, subaccount.address, subaccount.onchainData.active);
      }

      setSubaccountDeactivationState(SubaccountDeactivationState.Success);

      resetStoredApproval();
      resetStoredConfig();
      refreshSubaccountData();
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      metrics.pushError(error, "subaccount.tryDisableSubaccount");
      setSubaccountDeactivationFailureReason(getSubaccountDeactivationFailureReason(error, srcChainId !== undefined));
      setSubaccountDeactivationState(SubaccountDeactivationState.Error);
      return false;
    }
  }, [
    signer,
    subaccount,
    account,
    srcChainId,
    calcSelector,
    provider,
    chainId,
    resetStoredApproval,
    resetStoredConfig,
    refreshSubaccountData,
  ]);

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
      subaccountDeactivationFailureReason,
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
    subaccountDeactivationFailureReason,
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

    if (subaccountActivationState === SubaccountActivationState.GeneratingError) {
      status = "error";
      text = t`Session generation failed`;
    } else if (subaccountActivationState && subaccountActivationState >= SubaccountActivationState.ApprovalSigning) {
      status = "success";
      text = t`Session generated`;
    }

    return <TransactionStatus status={status} text={text} />;
  }, [subaccountActivationState]);

  const approvalSigningStatus = useMemo(() => {
    let status: TransactionStatusType = "muted";
    let text = t`Signing approval...`;

    if (subaccountActivationState === SubaccountActivationState.ApprovalSigning) {
      status = "loading";
    } else if (subaccountActivationState === SubaccountActivationState.ApprovalSigningError) {
      status = "error";
      text = t`Approval signing failed`;
    } else if (subaccountActivationState === SubaccountActivationState.Success) {
      status = "success";
      text = t`Approval signed`;
    }

    return <TransactionStatus status={status} text={text} />;
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

  useEffect(() => {
    if (hasError) {
      toast.update(toastId, { type: "error" });
    }
  }, [hasError, toastId]);

  return (
    <StatusNotification key="updateSubaccountSettingsSuccess" title={t`Activate 1CT`}>
      {generatingStatus}
      {approvalSigningStatus}
    </StatusNotification>
  );
}

function SubaccountDeactivateNotification({ toastId }: { toastId: number }) {
  const { subaccountDeactivationState, subaccountDeactivationFailureReason } = useSubaccountContext();
  const { chainId } = useChainId();

  const dismissTimerId = useRef<NodeJS.Timeout | undefined>(undefined);

  const hasError = subaccountDeactivationState === SubaccountDeactivationState.Error;
  const isCompleted =
    subaccountDeactivationState === SubaccountDeactivationState.Success ||
    subaccountDeactivationState === SubaccountDeactivationState.Error;

  const deactivatingStatus = useMemo(() => {
    let text = t`Deactivating...`;
    let status: TransactionStatusType = "loading";

    if (subaccountDeactivationState === SubaccountDeactivationState.Error) {
      status = "error";
      text = t`Deactivation failed`;
    } else if (subaccountDeactivationState === SubaccountDeactivationState.Success) {
      status = "success";
      text = t`Deactivated`;
    }

    return <TransactionStatus status={status} text={text} />;
  }, [subaccountDeactivationState]);

  const failureReasonStatus = useMemo(() => {
    if (!hasError || !subaccountDeactivationFailureReason) {
      return undefined;
    }

    let text: string;

    switch (subaccountDeactivationFailureReason) {
      case SubaccountDeactivationFailureReason.Rejected:
        text = t`The signature request was rejected in your wallet. Retry and confirm the request to deactivate.`;
        break;
      case SubaccountDeactivationFailureReason.InsufficientGasPaymentTokenBalance:
        text = t`Insufficient gas payment token balance in your GMX Account to cover network fees. Deposit funds and retry.`;
        break;
      case SubaccountDeactivationFailureReason.InsufficientNativeTokenBalance: {
        const nativeTokenSymbol = getNativeToken(chainId).symbol;
        text = t`Insufficient ${nativeTokenSymbol} balance to cover network fees. Add funds and retry.`;
        break;
      }
      case SubaccountDeactivationFailureReason.ExpressParamsNotReady:
        text = t`Express transaction data is still loading. Please retry in a few seconds.`;
        break;
      default:
        text = t`An unexpected error occurred. Please retry.`;
        break;
    }

    return <div className="text-body-small mt-4 text-typography-secondary">{text}</div>;
  }, [chainId, hasError, subaccountDeactivationFailureReason]);

  useEffect(() => {
    if (hasError) {
      toast.update(toastId, { type: "error" });
    }
  }, [hasError, toastId]);

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
    <StatusNotification title={t`Deactivate 1CT`}>
      {deactivatingStatus}
      {failureReasonStatus}
    </StatusNotification>
  );
}

function useStoredSubaccountData(
  chainId: ContractsChainId,
  srcChainId: SourceChainId | undefined,
  account: string | undefined
) {
  useMemo(() => migrateLegacySubaccountApprovalSlot(chainId, account), [chainId, account]);

  const [storageRevision, bumpStorageRevision] = useReducer((revision: number) => revision + 1, 0);

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

  const [rawStoredSignedApproval, setStoredSignedApproval] = useLocalStorageSerializeKey<
    SignedSubaccountApproval | undefined
  >(getSubaccountApprovalKey(chainId, account, srcChainId), undefined, {
    raw: false,
    serializer: serializeSubaccountApproval,
    deserializer: deserializeSubaccountApproval,
  });

  const storedSignedApproval =
    rawStoredSignedApproval && rawStoredSignedApproval.subaccount === subaccountConfig?.address
      ? rawStoredSignedApproval
      : undefined;

  const fallbackSignedApproval = useMemo(
    () => {
      if (storedSignedApproval || !account || !subaccountConfig?.address) {
        return undefined;
      }

      return findFallbackSubaccountApproval(chainId, account, subaccountConfig.address);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account, chainId, storedSignedApproval, subaccountConfig?.address, storageRevision]
  );

  const setSignedApproval = useCallback(
    (approval: SignedSubaccountApproval) => {
      if (account && getSubaccountApprovalContextSrcChainId(chainId, approval) !== srcChainId) {
        writeStoredSubaccountApproval(chainId, account, approval);
        bumpStorageRevision();
        return;
      }

      setStoredSignedApproval(approval);
    },
    [account, chainId, srcChainId, setStoredSignedApproval]
  );

  const resetStoredApproval = useCallback(() => {
    setStoredSignedApproval(null as any);

    if (account) {
      removeAllStoredSubaccountApprovals(chainId, account);
    }

    bumpStorageRevision();
  }, [account, chainId, setStoredSignedApproval]);

  const resetStoredConfig = useCallback(() => {
    setSubaccountConfig(null as any);
  }, [setSubaccountConfig]);

  return useMemo(() => {
    return {
      subaccountConfig,
      signedApproval: storedSignedApproval,
      fallbackSignedApproval,
      setSubaccountConfig,
      setSignedApproval,
      resetStoredApproval,
      resetStoredConfig,
    };
  }, [
    subaccountConfig,
    storedSignedApproval,
    fallbackSignedApproval,
    setSubaccountConfig,
    setSignedApproval,
    resetStoredApproval,
    resetStoredConfig,
  ]);
}
