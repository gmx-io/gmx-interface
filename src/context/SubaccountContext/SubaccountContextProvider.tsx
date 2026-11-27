import { plural, t } from "@lingui/macro";
import type { ethers } from "ethers";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "react-toastify";

import type { ContractsChainId, SourceChainId } from "config/chains";
import {
  selectExpressGlobalParams,
  selectGmxAccountGasPaymentToken,
  selectSettlementChainExpressFeeTokenAddress,
  selectSettlementChainExpressGlobalParams,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectIsSubaccountRelayRouterEnabled } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectTradeboxIsFromTokenGmxAccount } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useCalcSelector } from "context/SyntheticsStateContext/utils";
import { useTokenPermitsContext } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import type { ExpressTxnParams } from "domain/synthetics/express";
import { getOrderRelayRouterAddress } from "domain/synthetics/express/expressOrderUtils";
import {
  GMX_ACCOUNT_NETWORK_FEE_SOURCE,
  WALLET_NETWORK_FEE_SOURCE,
  getInsufficientFeeAction,
} from "domain/synthetics/fees/networkFeeSource";
import {
  estimateSettlementChainRemoveSubaccountExpressParams,
  getIsSubaccountActiveOnchain,
  getIsSubaccountRemovalRequired,
  removeSubaccountExpressTxn,
  removeSubaccountSettlementChainExpressTxn,
  removeSubaccountsWalletTxn,
  removeSubaccountWalletTxn,
} from "domain/synthetics/subaccount";
import type {
  SignedSubaccountApproval,
  Subaccount,
  SubaccountOnchainData,
  SubaccountSerializedConfig,
} from "domain/synthetics/subaccount";
import {
  getActivationPermitTokenAddresses,
  signActivationTokenPermits,
} from "domain/synthetics/subaccount/activationTokenPermits";
import {
  getShouldRetrySubaccountRemovalWithWalletTxn,
  SubaccountRemovalResultUnknownError,
} from "domain/synthetics/subaccount/errors";
import { generateSubaccount } from "domain/synthetics/subaccount/generateSubaccount";
import type { SubaccountRemovalTarget } from "domain/synthetics/subaccount/removeSubaccount";
import {
  findFallbackSubaccountApproval,
  findStoredSubaccountApprovals,
  migrateLegacySubaccountApprovalSlot,
  readStoredSubaccountApproval,
  removeAllStoredSubaccountApprovals,
  removeStoredSubaccountApproval,
  writeStoredSubaccountApproval,
} from "domain/synthetics/subaccount/subaccountApprovalStorage";
import {
  getIsLegacySubaccountConfig,
  keepLegacySubaccountConfig,
  readStoredLegacySubaccountConfig,
  readStoredSubaccountConfig,
  writeStoredSubaccountConfig,
} from "domain/synthetics/subaccount/subaccountConfigStorage";
import {
  sendSubaccountActivationMetric,
  sendSubaccountRemovalMetric,
  sendSubaccountSettingsUpdateMetric,
} from "domain/synthetics/subaccount/subaccountMetrics";
import {
  notifySubaccountStorageChanged,
  subscribeSubaccountStorageChanges,
  withSubaccountTabLock,
} from "domain/synthetics/subaccount/subaccountTabSync";
import { useSubaccountOnchainData } from "domain/synthetics/subaccount/useSubaccountOnchainData";
import {
  getActualApproval,
  getCanReuseSubaccount,
  getInitialSubaccountApproval,
  getIsLegacySubaccountRemovalRequired,
  getIsSubaccountActionsExceeded,
  getIsSubaccountActive,
  getIsSubaccountExpired,
  getSubaccountApprovalContextSrcChainId,
  getSubaccountOnchainData,
  getSubaccountSigner,
  getSubaccountValidations,
  signUpdatedSubaccountSettings,
  type SubaccountLimits,
} from "domain/synthetics/subaccount/utils";
import type { TokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { type ErrorLike, parseError, TxErrorType } from "lib/errors";
import { getInsufficientFeeError } from "lib/errors/customErrors";
import { helperToast } from "lib/helperToast";
import { metrics, type SubaccountRemovalEvent } from "lib/metrics";
import { useJsonRpcProvider } from "lib/rpc";
import type { WalletSigner } from "lib/wallets";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import useWallet from "lib/wallets/useWallet";
import { getIsContractAccount } from "lib/wallets/useWalletSessionChains";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { getContract } from "sdk/configs/contracts";
import { getNativeToken, getToken, isValidTokenSafe } from "sdk/configs/tokens";
import { ExpressEstimationInsufficientGasPaymentTokenBalanceError } from "sdk/utils/express";

import { getSmartWalletErrorToastContent } from "components/Errors/errorToasts";
import { StatusNotification } from "components/StatusNotification/StatusNotification";
import { TransactionStatus, TransactionStatusType } from "components/TransactionStatus/TransactionStatus";

enum SubaccountActivationState {
  Generating = 0,
  ApprovalSigning = 1,
  ApprovalSigningError = 2,
  Success = 3,
}

export enum SubaccountLegacyRemovalState {
  Removing = "removing",
  Removed = "removed",
  Failed = "failed",
  ApprovalRevocationFailed = "approvalRevocationFailed",
}

export type SubaccountActivationParams = {
  remainingActions?: bigint;
  remainingSeconds?: bigint;
  isGmxAccount?: boolean;
  // false for flows that don't trade from the wallet, like GMX Account deposits
  withTokenPermits?: boolean;
};

function composeSubaccount({
  chainId,
  srcChainId,
  account,
  config,
  provider,
  onchainData,
  signedApproval,
  fallbackSignedApproval,
}: {
  chainId: ContractsChainId;
  srcChainId: SourceChainId | undefined;
  account: string;
  config: SubaccountSerializedConfig;
  provider: ethers.Provider | undefined;
  onchainData: SubaccountOnchainData;
  signedApproval: SignedSubaccountApproval | undefined;
  fallbackSignedApproval: SignedSubaccountApproval | undefined;
}): Subaccount | undefined {
  if (!config.isNew) {
    return undefined;
  }

  const contextSignedApproval = getIsLegacySubaccountConfig(config)
    ? undefined
    : signedApproval ?? (onchainData.active ? undefined : fallbackSignedApproval);

  const subaccount: Subaccount = {
    address: config.address,
    signer: getSubaccountSigner(config, account, provider),
    onchainData,
    signedApproval: getActualApproval({
      chainId,
      address: config.address,
      onchainData,
      signedApproval: contextSignedApproval,
    }),
    chainId,
    signerChainId: srcChainId ?? chainId,
  };

  return getIsSubaccountActive(subaccount) ? subaccount : undefined;
}

export enum SubaccountDeactivationState {
  Deactivating = 0,
  Error = 1,
  Success = 2,
}

const COMPLETED_DEACTIVATION_DISMISS_DELAY = 5000;
const FAILED_DEACTIVATION_DISMISS_DELAY = 15000;

export enum SubaccountDeactivationFailureReason {
  Rejected = "rejected",
  InsufficientGasPaymentTokenBalance = "insufficientGasPaymentTokenBalance",
  InsufficientNativeTokenBalance = "insufficientNativeTokenBalance",
  ExpressParamsNotReady = "expressParamsNotReady",
  ResultUnknown = "resultUnknown",
  ResultUnknownWalletTxnNext = "resultUnknownWalletTxnNext",
  SignedRequestFailed = "signedRequestFailed",
  Unknown = "unknown",
}

function getSubaccountDeactivationFailureReason(
  error: unknown,
  { isGmxAccount, shouldRetryWithWalletTxn }: { isGmxAccount: boolean; shouldRetryWithWalletTxn: boolean }
): SubaccountDeactivationFailureReason {
  if (isGmxAccount && error instanceof ExpressEstimationInsufficientGasPaymentTokenBalanceError) {
    return SubaccountDeactivationFailureReason.InsufficientGasPaymentTokenBalance;
  }

  if (error instanceof SubaccountRemovalResultUnknownError) {
    return shouldRetryWithWalletTxn
      ? SubaccountDeactivationFailureReason.ResultUnknownWalletTxnNext
      : SubaccountDeactivationFailureReason.ResultUnknown;
  }

  if (shouldRetryWithWalletTxn) {
    return SubaccountDeactivationFailureReason.SignedRequestFailed;
  }

  const errorData = parseError(error as ErrorLike);

  if (errorData?.isUserRejectedError) {
    return SubaccountDeactivationFailureReason.Rejected;
  }

  if (
    isGmxAccount &&
    (errorData?.contractError === "InsufficientMultichainBalance" ||
      errorData?.contractError === "InsufficientRelayFee" ||
      errorData?.contractError === "InsufficientFunds")
  ) {
    return SubaccountDeactivationFailureReason.InsufficientGasPaymentTokenBalance;
  }

  if (errorData?.txErrorType === TxErrorType.NotEnoughFunds) {
    return isGmxAccount
      ? SubaccountDeactivationFailureReason.InsufficientGasPaymentTokenBalance
      : SubaccountDeactivationFailureReason.InsufficientNativeTokenBalance;
  }

  return SubaccountDeactivationFailureReason.Unknown;
}

function getSubaccountDeactivationFailureTokenSymbol({
  error,
  chainId,
  gasPaymentToken,
}: {
  error: unknown;
  chainId: ContractsChainId;
  gasPaymentToken: TokenData | undefined;
}): string | undefined {
  const feeError = getInsufficientFeeError(parseError(error as ErrorLike));

  if (feeError.isErrorMatched && feeError.tokenAddress && isValidTokenSafe(chainId, feeError.tokenAddress)) {
    return getToken(chainId, feeError.tokenAddress).symbol;
  }

  return gasPaymentToken?.symbol;
}

// undefined means the removal goes through the wallet transaction, without asking for a signature first
async function getSettlementChainRemovalExpressParams({
  chainId,
  account,
  signer,
  subaccount,
  calcSelector,
}: {
  chainId: ContractsChainId;
  account: string;
  signer: WalletSigner;
  subaccount: SubaccountRemovalTarget;
  calcSelector: ReturnType<typeof useCalcSelector>;
}): Promise<ExpressTxnParams | undefined> {
  try {
    const globalExpressParams = calcSelector(selectSettlementChainExpressGlobalParams);

    // the latest synthetics state can belong to another chain, e.g. on an account page
    if (globalExpressParams?.chainId !== chainId || !calcSelector(selectIsSubaccountRelayRouterEnabled)) {
      return undefined;
    }

    return await estimateSettlementChainRemoveSubaccountExpressParams({
      chainId,
      account,
      signer,
      subaccount,
      globalExpressParams,
    });
  } catch (error) {
    metrics.pushError(error, "subaccount.getSettlementChainRemovalExpressParams");
    return undefined;
  }
}

export type SubaccountState = {
  // limits saved in One-Click settings before activation, passed to tryEnableSubaccount by its callers
  initialSettings: SubaccountLimits | undefined;
  setInitialSettings: (settings: SubaccountLimits | undefined) => void;
  subaccountConfig: SubaccountSerializedConfig | undefined;
  legacySubaccountConfig: SubaccountSerializedConfig | undefined;
  subaccount: Subaccount | undefined;
  subaccountActivationState: SubaccountActivationState | undefined;
  subaccountActivationError: { message?: string; walletName?: string } | undefined;
  subaccountDeactivationState: SubaccountDeactivationState | undefined;
  subaccountDeactivationFailureReason: SubaccountDeactivationFailureReason | undefined;
  subaccountDeactivationFailureTokenSymbol: string | undefined;
  subaccountLegacyRemovalState: SubaccountLegacyRemovalState | undefined;
  updateSubaccountSettings: (params: {
    nextRemainigActions?: bigint;
    nextRemainingSeconds?: bigint;
    nextIsGmxAccount?: boolean;
  }) => Promise<boolean>;
  resetSubaccountApproval: () => void;
  invalidateSubaccountApproval: (approval: SignedSubaccountApproval) => boolean;
  tryEnableSubaccount: (params?: SubaccountActivationParams) => Promise<boolean>;
  tryDisableSubaccount: () => Promise<boolean>;
  removeSubaccountSessions: (subaccountAddresses: string[]) => Promise<boolean>;
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
  const [initialSettings, setInitialSettings] = useState<SubaccountLimits>();
  const { chainId, srcChainId } = useChainId();
  const signer = useEthersSigner();
  const { account } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);
  useEffect(() => setInitialSettings(undefined), [account, chainId, srcChainId]);

  const {
    tokenPermits,
    accountType: tokenPermitAccountType,
    getIsPermitAvailable,
    addTokenPermit,
    disableTokenPermits,
  } = useTokenPermitsContext();

  const {
    subaccountConfig,
    legacySubaccountConfig,
    signedApproval,
    fallbackSignedApproval,
    setSignedApproval,
    resetStoredApproval,
    removeStoredApproval,
    resetStoredConfig,
    commitStorageChange,
  } = useStoredSubaccountData(chainId, srcChainId, signer?.address);

  const [subaccountActivationState, setSubaccountActivationState] = useState<SubaccountActivationState | undefined>(
    undefined
  );

  const [subaccountActivationError, setSubaccountActivationError] = useState<
    { message?: string; walletName?: string } | undefined
  >(undefined);

  const [subaccountDeactivationState, setSubaccountDeactivationState] = useState<
    SubaccountDeactivationState | undefined
  >(undefined);

  const [subaccountDeactivationFailureReason, setSubaccountDeactivationFailureReason] = useState<
    SubaccountDeactivationFailureReason | undefined
  >(undefined);
  const [subaccountDeactivationFailureTokenSymbol, setSubaccountDeactivationFailureTokenSymbol] = useState<
    string | undefined
  >(undefined);

  const [subaccountLegacyRemovalState, setSubaccountLegacyRemovalState] = useState<
    SubaccountLegacyRemovalState | undefined
  >(undefined);

  const { subaccountData, refreshSubaccountData } = useSubaccountOnchainData(chainId, {
    account: signer?.address,
    subaccountAddress: subaccountConfig?.address,
    srcChainId,
  });

  const subaccount: Subaccount | undefined = useMemo(() => {
    if (!subaccountConfig || !signer?.address || !subaccountData || !signer?.provider) {
      return undefined;
    }

    return composeSubaccount({
      chainId,
      srcChainId,
      account: signer.address,
      config: subaccountConfig,
      provider: signer.provider,
      onchainData: subaccountData,
      signedApproval,
      fallbackSignedApproval,
    });
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

  const hasActiveSubaccount = subaccount !== undefined;
  useEffect(
    function clearAppliedInitialSettings() {
      // limits typed before activation are signed into one session; cleared once it is live, not on signing,
      // so the panel keeps showing them until the session's own limits load
      if (hasActiveSubaccount) setInitialSettings(undefined);
    },
    [hasActiveSubaccount]
  );

  const calcSelector = useCalcSelector();

  // once a signed removal fails, the next attempts use the wallet transaction
  const walletTxnRemovalKeyRef = useRef<string | undefined>(undefined);
  const unknownResultRemovalKeyRef = useRef<string | undefined>(undefined);
  const walletTxnSessionRemovalAddressesRef = useRef<Set<string>>(new Set());

  const removeSubaccountAddresses = useCallback(
    async (subaccountAddresses: string[], onRemoved?: () => void) => {
      if (!signer || !account) {
        throw new Error("No signer for subaccount removal");
      }

      if (srcChainId !== undefined) {
        for (const address of subaccountAddresses) {
          const globalExpressParams = calcSelector(selectExpressGlobalParams);

          if (!globalExpressParams) {
            throw new Error("Missing globalExpressParams for subaccount removal");
          }

          await removeSubaccountExpressTxn({
            chainId,
            account,
            srcChainId,
            signer,
            subaccount: { address },
            globalExpressParams,
          });
          onRemoved?.();
        }

        return;
      }

      if (subaccountAddresses.length > 1) {
        await removeSubaccountsWalletTxn(chainId, signer, subaccountAddresses);
        return;
      }

      const [address] = subaccountAddresses;

      const expressParams = walletTxnSessionRemovalAddressesRef.current.has(address)
        ? undefined
        : await getSettlementChainRemovalExpressParams({
            chainId,
            account,
            signer,
            subaccount: { address },
            calcSelector,
          });

      if (!expressParams) {
        await removeSubaccountWalletTxn(chainId, signer, address);
        return;
      }

      try {
        await removeSubaccountSettlementChainExpressTxn({
          chainId,
          signer,
          subaccount: { address },
          expressParams,
        });
      } catch (error) {
        if (getShouldRetrySubaccountRemovalWithWalletTxn(error)) {
          walletTxnSessionRemovalAddressesRef.current.add(address);
        }

        throw error;
      }
    },
    [account, calcSelector, chainId, signer, srcChainId]
  );

  const removeLegacySubaccount = useCallback(
    async ({
      removedSubaccountAddress,
      pendingApprovals = [],
    }: {
      removedSubaccountAddress?: string;
      pendingApprovals?: SignedSubaccountApproval[];
    } = {}) => {
      if (!account) {
        return;
      }

      const legacyConfig = readStoredLegacySubaccountConfig(chainId, account);

      if (!legacyConfig || legacyConfig.address === removedSubaccountAddress) {
        return;
      }

      const isListed = await getIsSubaccountActiveOnchain({
        chainId,
        account,
        subaccountAddress: legacyConfig.address,
      });

      let onchainData: SubaccountOnchainData | undefined;

      if (isListed === false && pendingApprovals.length > 0 && signer && provider) {
        try {
          onchainData = await getSubaccountOnchainData({
            chainId,
            signer,
            provider,
            subaccountAddress: legacyConfig.address,
          });
        } catch (error) {
          metrics.pushError(error, "subaccount.removeLegacySubaccount");
        }
      }

      if (
        !getIsLegacySubaccountRemovalRequired({
          chainId,
          subaccountAddress: legacyConfig.address,
          isListed,
          onchainData,
          pendingApprovals,
        })
      ) {
        return;
      }

      setSubaccountLegacyRemovalState(SubaccountLegacyRemovalState.Removing);

      try {
        await removeSubaccountAddresses([legacyConfig.address]);
        setSubaccountLegacyRemovalState(SubaccountLegacyRemovalState.Removed);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        metrics.pushError(error, "subaccount.removeLegacySubaccount");
        setSubaccountLegacyRemovalState(
          isListed === false
            ? SubaccountLegacyRemovalState.ApprovalRevocationFailed
            : SubaccountLegacyRemovalState.Failed
        );
      }
    },
    [account, chainId, provider, removeSubaccountAddresses, signer]
  );

  const getCurrentSubaccount = useCallback(async (): Promise<Subaccount | undefined> => {
    if (!subaccountConfig || getIsLegacySubaccountConfig(subaccountConfig) || !signer || !provider) {
      return undefined;
    }

    if (subaccountData) {
      return subaccount;
    }

    let onchainData: SubaccountOnchainData;

    try {
      onchainData = await getSubaccountOnchainData({
        chainId,
        signer,
        provider,
        subaccountAddress: subaccountConfig.address,
      });
    } catch (error) {
      metrics.pushError(error, "subaccount.getCurrentSubaccount");
      return undefined;
    }

    return composeSubaccount({
      chainId,
      srcChainId,
      account: signer.address,
      config: subaccountConfig,
      provider: signer.provider ?? undefined,
      onchainData,
      signedApproval,
      fallbackSignedApproval,
    });
  }, [
    chainId,
    fallbackSignedApproval,
    provider,
    signedApproval,
    signer,
    srcChainId,
    subaccount,
    subaccountConfig,
    subaccountData,
  ]);

  const signSubaccountSettingsUpdate = useCallback(
    async ({
      subaccount: updatedSubaccount,
      nextRemainigActions,
      nextRemainingSeconds,
      isGmxAccount,
    }: {
      subaccount: Subaccount;
      nextRemainigActions?: bigint;
      nextRemainingSeconds?: bigint;
      isGmxAccount: boolean;
    }): Promise<boolean> => {
      if (!signer || !provider || !account) {
        return false;
      }

      helperToast.info(
        <StatusNotification key="updateSubaccountSettings" title={t`Update 1CT settings`}>
          <TransactionStatus status="loading" text={t`Updating settings...`} />
        </StatusNotification>
      );

      const settingsUpdateMetricParams = {
        wasExpired: getIsSubaccountExpired(updatedSubaccount),
        wasActionsExceeded: getIsSubaccountActionsExceeded(updatedSubaccount, 1),
        isGmxAccount,
        chainId,
      };

      try {
        const signedSubaccountApproval = await signUpdatedSubaccountSettings({
          chainId,
          signer,
          provider,
          subaccount: updatedSubaccount,
          nextRemainigActions,
          nextRemainingSeconds,
          isGmxAccount,
        });

        const isUpdated = await withSubaccountTabLock(chainId, account, async () => {
          if (readStoredSubaccountConfig(chainId, account)?.address !== updatedSubaccount.address) {
            return false;
          }

          setSignedApproval(signedSubaccountApproval);
          return true;
        });

        if (isUpdated) {
          sendSubaccountSettingsUpdateMetric(settingsUpdateMetricParams);
          helperToast.success(
            <StatusNotification key="updateSubaccountSettingsSuccess" title={t`Update 1CT settings`}>
              <TransactionStatus status="success" text={t`Settings updated`} />
            </StatusNotification>
          );
          return true;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        metrics.pushError(error, "subaccount.updateSubaccountSettings");
        sendSubaccountSettingsUpdateMetric({ ...settingsUpdateMetricParams, error });
      }

      toast.dismiss();
      helperToast.error(
        <StatusNotification key="updateSubaccountSettingsError" title={t`Update 1CT settings`}>
          <TransactionStatus status="error" text={t`Settings update failed`} />
        </StatusNotification>
      );
      return false;
    },
    [account, chainId, provider, setSignedApproval, signer]
  );

  const tryEnableSubaccount = useCallback(
    async ({
      remainingActions,
      remainingSeconds,
      isGmxAccount: isGmxAccountParam,
      withTokenPermits = true,
    }: SubaccountActivationParams = {}) => {
      if (
        !provider ||
        !signer ||
        !account ||
        (await getIsContractAccount({ address: signer.address, referenceChainId: chainId }))
      ) {
        return false;
      }

      const currentSubaccount = await getCurrentSubaccount();
      const isGmxAccount = isGmxAccountParam ?? calcSelector(selectTradeboxIsFromTokenGmxAccount);

      if (currentSubaccount && getCanReuseSubaccount(currentSubaccount, subaccountConfig)) {
        const { isNonceExpired, isApprovalInvalid } = getSubaccountValidations({
          requiredActions: 1,
          subaccount: currentSubaccount,
          subaccountRouterAddress: getOrderRelayRouterAddress(chainId, true, isGmxAccount),
        });

        if (!isNonceExpired && !isApprovalInvalid) {
          return true;
        }

        return signSubaccountSettingsUpdate({
          subaccount: currentSubaccount,
          nextRemainigActions: remainingActions,
          nextRemainingSeconds: remainingSeconds,
          isGmxAccount,
        });
      }

      setSubaccountActivationError(undefined);
      setSubaccountLegacyRemovalState(undefined);

      const toastId = Date.now();

      helperToast.info(<SubaccountActivateNotification toastId={toastId} />, {
        autoClose: false,
        toastId,
      });

      setSubaccountActivationState(SubaccountActivationState.Generating);

      const addressBeforeSigning = subaccountConfig?.address;
      const getIsCreatedInAnotherTab = () => {
        const storedConfig = readStoredSubaccountConfig(chainId, account);

        return Boolean(
          storedConfig &&
            !getIsLegacySubaccountConfig(storedConfig) &&
            storedConfig.address !== addressBeforeSigning &&
            findFallbackSubaccountApproval(chainId, account, storedConfig.address)
        );
      };
      let isCreatedInThisTab = false;
      let pendingLegacyApprovals: SignedSubaccountApproval[] = [];

      try {
        if (!getIsCreatedInAnotherTab()) {
          const config = generateSubaccount(account);

          setSubaccountActivationState(SubaccountActivationState.ApprovalSigning);

          const approval = await getInitialSubaccountApproval({
            chainId,
            signer,
            provider,
            subaccountAddress: config.address,
            isGmxAccount,
            remainingSeconds,
            remainingActions,
          });

          await withSubaccountTabLock(chainId, account, async () => {
            if (getIsCreatedInAnotherTab()) {
              return;
            }

            const storedConfig = readStoredSubaccountConfig(chainId, account);

            if (storedConfig && getIsLegacySubaccountConfig(storedConfig)) {
              pendingLegacyApprovals = findStoredSubaccountApprovals(chainId, account, storedConfig.address);
              keepLegacySubaccountConfig(chainId, account, storedConfig);
            }

            writeStoredSubaccountConfig(chainId, account, config);
            removeAllStoredSubaccountApprovals(chainId, account);
            writeStoredSubaccountApproval(chainId, account, approval);
            isCreatedInThisTab = true;
          });
        }
      } catch (error) {
        setSubaccountActivationState(SubaccountActivationState.ApprovalSigningError);
        setSubaccountActivationError({ message: error?.message, walletName: error?.data?.walletName });
        // eslint-disable-next-line no-console
        console.error(error);
        metrics.pushError(error, "subaccount.signDefaultApproval");
        sendSubaccountActivationMetric({ failedStep: "approval", isNewKey: true, isGmxAccount, chainId, error });
        return false;
      } finally {
        commitStorageChange();
      }

      // a new session starts with the signed removal again, whatever happened to the previous one
      walletTxnRemovalKeyRef.current = undefined;
      unknownResultRemovalKeyRef.current = undefined;

      setSubaccountActivationState(SubaccountActivationState.Success);
      sendSubaccountActivationMetric({ isNewKey: isCreatedInThisTab, isGmxAccount, chainId });
      refreshSubaccountData();

      if (isCreatedInThisTab) {
        await removeLegacySubaccount({ pendingApprovals: pendingLegacyApprovals });
      }

      // only wallet-funded orders on the settlement chain spend through the Router; not awaited, so a wallet
      // that never answers a permit prompt can't hold the activation
      if (isCreatedInThisTab && withTokenPermits && srcChainId === undefined && !isGmxAccount) {
        void (async () => {
          try {
            const spender = getContract(chainId, "SyntheticsRouter");

            const tokenAddresses = await getActivationPermitTokenAddresses({
              chainId,
              client: getPublicClientWithRpc(chainId),
              account: signer.address,
              spender,
              gasPaymentTokenAddress: calcSelector(selectSettlementChainExpressFeeTokenAddress),
              tokenPermits,
              getIsPermitAvailable,
            });

            await signActivationTokenPermits({
              chainId,
              account: signer.address,
              spender,
              tokenAddresses,
              accountType: tokenPermitAccountType,
              addTokenPermit,
              disableTokenPermits,
            });
          } catch (error) {
            // One-Click is already active, the tokens just keep the approval flow
            metrics.pushError(error, "subaccount.activationTokenPermits");
          }
        })();
      }

      return true;
    },
    [
      account,
      addTokenPermit,
      calcSelector,
      chainId,
      commitStorageChange,
      disableTokenPermits,
      getCurrentSubaccount,
      getIsPermitAvailable,
      provider,
      refreshSubaccountData,
      removeLegacySubaccount,
      signSubaccountSettingsUpdate,
      signer,
      srcChainId,
      subaccountConfig,
      tokenPermitAccountType,
      tokenPermits,
    ]
  );

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
      if (!signer || !subaccount?.address || !provider || !account || !subaccountConfig) {
        return false;
      }

      if (!getCanReuseSubaccount(subaccount, subaccountConfig)) {
        return tryEnableSubaccount({
          remainingActions: nextRemainigActions,
          remainingSeconds: nextRemainingSeconds,
          isGmxAccount: nextIsGmxAccount,
          withTokenPermits: false,
        });
      }

      return signSubaccountSettingsUpdate({
        subaccount,
        nextRemainigActions,
        nextRemainingSeconds,
        isGmxAccount: nextIsGmxAccount ?? calcSelector(selectTradeboxIsFromTokenGmxAccount),
      });
    },
    [
      signer,
      subaccount,
      provider,
      account,
      subaccountConfig,
      calcSelector,
      signSubaccountSettingsUpdate,
      tryEnableSubaccount,
    ]
  );

  const resetSubaccountApproval = useCallback(() => {
    resetStoredApproval();
    refreshSubaccountData();
  }, [refreshSubaccountData, resetStoredApproval]);

  const invalidateSubaccountApproval = useCallback(
    (approval: SignedSubaccountApproval) => {
      const isRemoved = removeStoredApproval(approval);
      refreshSubaccountData();
      return isRemoved;
    },
    [refreshSubaccountData, removeStoredApproval]
  );

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
    setSubaccountLegacyRemovalState(undefined);

    const removalKey = `${chainId}:${subaccount.address}`;
    let settlementChainExpressParams: ExpressTxnParams | undefined;
    let removalMethod: SubaccountRemovalEvent["data"]["method"];

    const finishDeactivation = async () => {
      setSubaccountDeactivationState(SubaccountDeactivationState.Success);

      walletTxnRemovalKeyRef.current = undefined;
      unknownResultRemovalKeyRef.current = undefined;

      await withSubaccountTabLock(chainId, account, async () => {
        const storedConfig = readStoredSubaccountConfig(chainId, account);

        if (storedConfig?.address !== subaccount.address) {
          return;
        }

        if (getIsLegacySubaccountConfig(storedConfig)) {
          keepLegacySubaccountConfig(chainId, account, storedConfig);
        }

        resetStoredApproval();
        resetStoredConfig();
      });

      refreshSubaccountData();

      await removeLegacySubaccount({ removedSubaccountAddress: subaccount.address });
    };

    try {
      const isAfterUnknownResult = unknownResultRemovalKeyRef.current === removalKey;

      if (!(await getIsSubaccountRemovalRequired({ chainId, subaccount, account, isAfterUnknownResult }))) {
        sendSubaccountRemovalMetric({ method: "none", chainId });
        await finishDeactivation();
        return true;
      }

      if (srcChainId !== undefined) {
        const globalExpressParams = calcSelector(selectExpressGlobalParams);

        if (!globalExpressParams) {
          const error = new Error("Missing globalExpressParams for subaccount deactivation");
          metrics.pushError(error, "subaccount.tryDisableSubaccount");
          sendSubaccountRemovalMetric({ method: undefined, chainId, error });
          setSubaccountDeactivationFailureReason(SubaccountDeactivationFailureReason.ExpressParamsNotReady);
          setSubaccountDeactivationState(SubaccountDeactivationState.Error);
          return false;
        }

        removalMethod = "signature";
        await removeSubaccountExpressTxn({
          chainId,
          account,
          srcChainId,
          signer,
          subaccount,
          globalExpressParams,
        });
      } else {
        if (walletTxnRemovalKeyRef.current !== removalKey) {
          settlementChainExpressParams = await getSettlementChainRemovalExpressParams({
            chainId,
            account,
            signer,
            subaccount,
            calcSelector,
          });
        }

        if (settlementChainExpressParams) {
          removalMethod = "signature";
          await removeSubaccountSettlementChainExpressTxn({
            chainId,
            signer,
            subaccount,
            expressParams: settlementChainExpressParams,
          });
        } else {
          removalMethod = "walletTxn";
          await removeSubaccountWalletTxn(chainId, signer, subaccount.address);
        }
      }

      sendSubaccountRemovalMetric({ method: removalMethod, chainId });
      await finishDeactivation();
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      metrics.pushError(error, "subaccount.tryDisableSubaccount");
      sendSubaccountRemovalMetric({ method: removalMethod, chainId, error });

      const isGmxAccount = srcChainId !== undefined;
      const shouldRetryWithWalletTxn =
        settlementChainExpressParams !== undefined && getShouldRetrySubaccountRemovalWithWalletTxn(error);

      if (shouldRetryWithWalletTxn) {
        walletTxnRemovalKeyRef.current = removalKey;
      }

      if (error instanceof SubaccountRemovalResultUnknownError) {
        unknownResultRemovalKeyRef.current = removalKey;
      }

      const failureReason = getSubaccountDeactivationFailureReason(error, { isGmxAccount, shouldRetryWithWalletTxn });

      if (
        failureReason === SubaccountDeactivationFailureReason.ResultUnknown ||
        failureReason === SubaccountDeactivationFailureReason.ResultUnknownWalletTxnNext
      ) {
        refreshSubaccountData();
      }

      setSubaccountDeactivationFailureReason(failureReason);
      setSubaccountDeactivationFailureTokenSymbol(
        getSubaccountDeactivationFailureTokenSymbol({
          error,
          chainId,
          gasPaymentToken: calcSelector(selectGmxAccountGasPaymentToken),
        })
      );
      setSubaccountDeactivationState(SubaccountDeactivationState.Error);
      return false;
    }
  }, [
    signer,
    subaccount,
    account,
    srcChainId,
    calcSelector,
    chainId,
    resetStoredApproval,
    resetStoredConfig,
    refreshSubaccountData,
    removeLegacySubaccount,
  ]);

  const removeSubaccountSessions = useCallback(
    async (subaccountAddresses: string[]): Promise<boolean> => {
      if (!signer || !account || subaccountAddresses.length === 0) {
        return false;
      }

      helperToast.info(
        <StatusNotification key="removeSubaccountSessions" title={t`Remove 1CT sessions`}>
          <TransactionStatus status="loading" text={t`Removing...`} />
        </StatusNotification>
      );

      let removedCount = 0;

      try {
        await removeSubaccountAddresses(subaccountAddresses, () => {
          removedCount += 1;
        });

        toast.dismiss();
        helperToast.success(
          <StatusNotification key="removeSubaccountSessionsSuccess" title={t`Remove 1CT sessions`}>
            <TransactionStatus status="success" text={t`Removed`} />
          </StatusNotification>
        );
        return true;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        metrics.pushError(error, "subaccount.removeSubaccountSessions");
        toast.dismiss();

        const isRejected = parseError(error as ErrorLike)?.isUserRejectedError;

        helperToast.error(
          <StatusNotification key="removeSubaccountSessionsError" title={t`Remove 1CT sessions`}>
            {removedCount > 0 && (
              <TransactionStatus
                status="success"
                text={plural(subaccountAddresses.length, {
                  one: `${removedCount} of # session removed`,
                  other: `${removedCount} of # sessions removed`,
                })}
              />
            )}
            <TransactionStatus status="error" text={isRejected ? t`Removal cancelled` : t`Removal failed`} />
          </StatusNotification>
        );
        return false;
      }
    },
    [account, removeSubaccountAddresses, signer]
  );

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
      initialSettings,
      setInitialSettings,
      subaccountConfig,
      legacySubaccountConfig,
      subaccount,
      subaccountActivationState,
      subaccountActivationError,
      subaccountDeactivationState,
      subaccountDeactivationFailureReason,
      subaccountDeactivationFailureTokenSymbol,
      subaccountLegacyRemovalState,
      updateSubaccountSettings,
      resetSubaccountApproval,
      invalidateSubaccountApproval,
      tryEnableSubaccount,
      tryDisableSubaccount,
      removeSubaccountSessions,
      refreshSubaccountData,
    };
  }, [
    initialSettings,
    subaccountConfig,
    legacySubaccountConfig,
    subaccount,
    subaccountActivationState,
    subaccountActivationError,
    subaccountDeactivationState,
    subaccountDeactivationFailureReason,
    subaccountDeactivationFailureTokenSymbol,
    subaccountLegacyRemovalState,
    updateSubaccountSettings,
    resetSubaccountApproval,
    invalidateSubaccountApproval,
    tryEnableSubaccount,
    tryDisableSubaccount,
    removeSubaccountSessions,
    refreshSubaccountData,
  ]);

  return <SubaccountContext.Provider value={state}>{children}</SubaccountContext.Provider>;
}

const DISABLED_SUBACCOUNT_STATE: SubaccountState = {
  initialSettings: undefined,
  setInitialSettings: () => undefined,
  subaccountConfig: undefined,
  legacySubaccountConfig: undefined,
  subaccount: undefined,
  subaccountActivationState: undefined,
  subaccountActivationError: undefined,
  subaccountDeactivationState: undefined,
  subaccountDeactivationFailureReason: undefined,
  subaccountDeactivationFailureTokenSymbol: undefined,
  subaccountLegacyRemovalState: undefined,
  updateSubaccountSettings: async () => false,
  resetSubaccountApproval: () => undefined,
  invalidateSubaccountApproval: () => false,
  tryEnableSubaccount: async () => false,
  tryDisableSubaccount: async () => false,
  removeSubaccountSessions: async () => false,
  refreshSubaccountData: () => undefined,
};

/**
 * For networks without One-Click trading: consumers that stay mounted there read an inactive subaccount
 */
export function DisabledSubaccountContextProvider({ children }: { children: React.ReactNode }) {
  return <SubaccountContext.Provider value={DISABLED_SUBACCOUNT_STATE}>{children}</SubaccountContext.Provider>;
}

function SubaccountLegacyRemovalStatus({ state }: { state: SubaccountLegacyRemovalState | undefined }) {
  if (state === undefined) {
    return null;
  }

  if (state === SubaccountLegacyRemovalState.Removing) {
    return <TransactionStatus status="loading" text={t`Removing old session...`} />;
  }

  if (state === SubaccountLegacyRemovalState.Removed) {
    return <TransactionStatus status="success" text={t`Old session removed`} />;
  }

  if (state === SubaccountLegacyRemovalState.ApprovalRevocationFailed) {
    return <TransactionStatus status="error" text={t`Old session wasn't removed`} />;
  }

  return <TransactionStatus status="error" text={t`Old session is still listed. Remove it in One-Click sessions`} />;
}

function SubaccountActivateNotification({ toastId }: { toastId: number }) {
  const { chainId } = useChainId();
  const { subaccountActivationState, subaccountActivationError, subaccountLegacyRemovalState } = useSubaccountContext();

  const errorContent = useMemo(
    () =>
      subaccountActivationError
        ? getSmartWalletErrorToastContent(
            chainId,
            subaccountActivationError.message,
            subaccountActivationError.walletName
          )
        : undefined,
    [chainId, subaccountActivationError]
  );

  const dismissTimerId = useRef<NodeJS.Timeout | undefined>(undefined);

  const hasError = subaccountActivationState === SubaccountActivationState.ApprovalSigningError;

  const isCompleted =
    (subaccountActivationState === SubaccountActivationState.Success &&
      subaccountLegacyRemovalState !== SubaccountLegacyRemovalState.Removing) ||
    hasError;

  const generatingStatus = useMemo(() => {
    let text = t`Generating session...`;
    let status: TransactionStatusType = "loading";

    if (subaccountActivationState && subaccountActivationState >= SubaccountActivationState.ApprovalSigning) {
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
      // Actionable errors stay until dismissed — they carry a link to follow.
      if (
        isCompleted &&
        !errorContent &&
        subaccountLegacyRemovalState !== SubaccountLegacyRemovalState.Failed &&
        !dismissTimerId.current
      ) {
        dismissTimerId.current = setTimeout(() => {
          toast.dismiss(toastId);
          dismissTimerId.current = undefined;
        }, 5000);
      }

      return () => {
        if (dismissTimerId.current) {
          clearTimeout(dismissTimerId.current);
          dismissTimerId.current = undefined;
        }
      };
    },
    [isCompleted, subaccountActivationState, errorContent, subaccountLegacyRemovalState, toastId]
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
      <SubaccountLegacyRemovalStatus state={subaccountLegacyRemovalState} />
      {hasError && errorContent && <div className="mt-8">{errorContent}</div>}
    </StatusNotification>
  );
}

function SubaccountDeactivateNotification({ toastId }: { toastId: number }) {
  const {
    subaccountDeactivationState,
    subaccountDeactivationFailureReason,
    subaccountDeactivationFailureTokenSymbol,
    subaccountLegacyRemovalState,
  } = useSubaccountContext();
  const { chainId } = useChainId();

  const dismissTimerId = useRef<NodeJS.Timeout | undefined>(undefined);

  const hasError = subaccountDeactivationState === SubaccountDeactivationState.Error;
  const isCompleted =
    (subaccountDeactivationState === SubaccountDeactivationState.Success &&
      subaccountLegacyRemovalState !== SubaccountLegacyRemovalState.Removing) ||
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
        text = t`The signature request was rejected in your wallet. Retry and confirm the request to deactivate`;
        break;
      case SubaccountDeactivationFailureReason.InsufficientGasPaymentTokenBalance: {
        const tokenSymbol = subaccountDeactivationFailureTokenSymbol;
        text = tokenSymbol
          ? `${t`Insufficient ${tokenSymbol} in your GMX Account for gas.`} ${getInsufficientFeeAction({ tokenSymbol, feeSource: GMX_ACCOUNT_NETWORK_FEE_SOURCE })}`
          : t`Insufficient gas payment token balance in your GMX Account to cover network fees. Deposit funds and retry`;
        break;
      }
      case SubaccountDeactivationFailureReason.InsufficientNativeTokenBalance: {
        const tokenSymbol = getNativeToken(chainId).symbol;
        text = `${t`Insufficient ${tokenSymbol} in your wallet for gas.`} ${getInsufficientFeeAction({ tokenSymbol, feeSource: WALLET_NETWORK_FEE_SOURCE })}`;
        break;
      }
      case SubaccountDeactivationFailureReason.ExpressParamsNotReady:
        text = t`Express transaction data is still loading. Retry in a few seconds`;
        break;
      case SubaccountDeactivationFailureReason.ResultUnknown:
        text = t`The request was sent, but its result could not be confirmed. It may have gone through — retry to check and finish the deactivation`;
        break;
      case SubaccountDeactivationFailureReason.ResultUnknownWalletTxnNext:
        text = t`The request was sent, but its result could not be confirmed. Retry to check: if it didn't go through, deactivation continues with a wallet transaction.`;
        break;
      case SubaccountDeactivationFailureReason.SignedRequestFailed:
        text = t`The signed request could not be completed. Retry to deactivate with a wallet transaction.`;
        break;
      default:
        text = t`An unexpected error occurred. Retry`;
        break;
    }

    return <div className="text-body-small mt-4 text-typography-secondary">{text}</div>;
  }, [chainId, hasError, subaccountDeactivationFailureReason, subaccountDeactivationFailureTokenSymbol]);

  useEffect(() => {
    if (hasError) {
      toast.update(toastId, { type: "error" });
    }
  }, [hasError, toastId]);

  useEffect(
    function cleanup() {
      if (
        isCompleted &&
        subaccountLegacyRemovalState !== SubaccountLegacyRemovalState.Failed &&
        !dismissTimerId.current
      ) {
        dismissTimerId.current = setTimeout(
          () => {
            toast.dismiss(toastId);
            dismissTimerId.current = undefined;
          },
          hasError ? FAILED_DEACTIVATION_DISMISS_DELAY : COMPLETED_DEACTIVATION_DISMISS_DELAY
        );
      }

      return () => {
        if (dismissTimerId.current) {
          clearTimeout(dismissTimerId.current);
          dismissTimerId.current = undefined;
        }
      };
    },
    [hasError, isCompleted, subaccountDeactivationState, subaccountLegacyRemovalState, toastId]
  );

  return (
    <StatusNotification title={t`Deactivate 1CT`}>
      {deactivatingStatus}
      {failureReasonStatus}
      <SubaccountLegacyRemovalStatus state={subaccountLegacyRemovalState} />
    </StatusNotification>
  );
}

function useStoredSubaccountData(
  chainId: ContractsChainId,
  srcChainId: SourceChainId | undefined,
  account: string | undefined
) {
  // Deliberately during render, not in an effect: the approval slot below is read during render,
  // so the legacy slot has to be moved before that read happens. The migration is idempotent,
  // so a repeated render is safe.
  useMemo(() => migrateLegacySubaccountApprovalSlot(chainId, account), [chainId, account]);

  const [storageRevision, bumpStorageRevision] = useReducer((revision: number) => revision + 1, 0);

  useEffect(() => {
    if (!account) {
      return undefined;
    }

    return subscribeSubaccountStorageChanges(chainId, account, bumpStorageRevision);
  }, [account, chainId]);

  const commitStorageChange = useCallback(() => {
    bumpStorageRevision();

    if (account) {
      notifySubaccountStorageChanged(chainId, account);
    }
  }, [account, chainId]);

  const subaccountConfig = useMemo(
    () => (account ? readStoredSubaccountConfig(chainId, account) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account, chainId, storageRevision]
  );

  const legacySlotConfig = useMemo(
    () => (account ? readStoredLegacySubaccountConfig(chainId, account) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account, chainId, storageRevision]
  );

  const legacySubaccountConfig =
    subaccountConfig && getIsLegacySubaccountConfig(subaccountConfig) ? subaccountConfig : legacySlotConfig;

  const rawStoredSignedApproval = useMemo(
    () => (account ? readStoredSubaccountApproval(chainId, account, srcChainId) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account, chainId, srcChainId, storageRevision]
  );

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
      if (!account) {
        return;
      }

      writeStoredSubaccountApproval(chainId, account, approval);
      commitStorageChange();
    },
    [account, chainId, commitStorageChange]
  );

  const resetStoredApproval = useCallback(() => {
    if (account) {
      removeAllStoredSubaccountApprovals(chainId, account);
    }

    commitStorageChange();
  }, [account, chainId, commitStorageChange]);

  const removeStoredApproval = useCallback(
    (approval: SignedSubaccountApproval) => {
      if (!account) {
        return false;
      }

      const approvalSrcChainId = getSubaccountApprovalContextSrcChainId(chainId, approval);

      if (readStoredSubaccountApproval(chainId, account, approvalSrcChainId)?.signature !== approval.signature) {
        return false;
      }

      removeStoredSubaccountApproval(chainId, account, approvalSrcChainId);
      commitStorageChange();

      return true;
    },
    [account, chainId, commitStorageChange]
  );

  const resetStoredConfig = useCallback(() => {
    if (account) {
      writeStoredSubaccountConfig(chainId, account, undefined);
    }

    commitStorageChange();
  }, [account, chainId, commitStorageChange]);

  return useMemo(() => {
    return {
      subaccountConfig,
      legacySubaccountConfig,
      signedApproval: storedSignedApproval,
      fallbackSignedApproval,
      setSignedApproval,
      resetStoredApproval,
      removeStoredApproval,
      resetStoredConfig,
      commitStorageChange,
    };
  }, [
    subaccountConfig,
    legacySubaccountConfig,
    storedSignedApproval,
    fallbackSignedApproval,
    setSignedApproval,
    resetStoredApproval,
    removeStoredApproval,
    resetStoredConfig,
    commitStorageChange,
  ]);
}
