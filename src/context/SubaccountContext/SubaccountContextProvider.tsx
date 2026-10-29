import { t } from "@lingui/macro";
import type { ethers } from "ethers";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "react-toastify";

import type { ContractsChainId, SourceChainId } from "config/chains";
import {
  selectExpressGlobalParams,
  selectGmxAccountGasPaymentToken,
  selectSettlementChainExpressGlobalParams,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectIsSubaccountRelayRouterEnabled } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectGasPaymentTokenAddress } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectTradeboxIsFromTokenGmxAccount } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useCalcSelector } from "context/SyntheticsStateContext/utils";
import { useTokenPermitsContext } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import type { ExpressTxnParams } from "domain/synthetics/express";
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
import {
  generatePasskeySubaccount,
  getIsPasskeySubaccountConfig,
  getPasskeyErrorText,
  PasskeyError,
  PasskeyErrorReason,
  type PasskeyMode,
} from "domain/synthetics/subaccount/passkey";
import type { SubaccountRemovalTarget } from "domain/synthetics/subaccount/removeSubaccount";
import {
  findFallbackSubaccountApproval,
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
  notifySubaccountStorageChanged,
  subscribeSubaccountStorageChanges,
  withSubaccountTabLock,
} from "domain/synthetics/subaccount/subaccountTabSync";
import { useSubaccountOnchainData } from "domain/synthetics/subaccount/useSubaccountOnchainData";
import {
  getActualApproval,
  getInitialSubaccountApproval,
  getIsSubaccountActionsExceeded,
  getIsSubaccountActive,
  getIsSubaccountExpired,
  getSubaccountApprovalContextSrcChainId,
  getSubaccountOnchainData,
  getSubaccountSigner,
  signUpdatedSubaccountSettings,
} from "domain/synthetics/subaccount/utils";
import type { TokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { type ErrorLike, parseError, TxErrorType } from "lib/errors";
import { getInsufficientFeeError } from "lib/errors/customErrors";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
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
  GeneratingError = 4,
}

type SubaccountKeySource = "random" | "passkey";

type SubaccountActivationError = { message?: string; walletName?: string; passkeyReason?: PasskeyErrorReason };

export enum SubaccountLegacyRemovalState {
  Removing = "removing",
  Removed = "removed",
  Failed = "failed",
}

export type SubaccountActivationParams = {
  remainingActions?: bigint;
  remainingSeconds?: bigint;
  isGmxAccount?: boolean;
  // false for flows that don't trade from the wallet, like GMX Account deposits
  withTokenPermits?: boolean;
  passkeyMode?: PasskeyMode;
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

function getIsSubaccountUsable(subaccount: Subaccount): boolean {
  return !getIsSubaccountExpired(subaccount) && !getIsSubaccountActionsExceeded(subaccount, 1);
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
  subaccountConfig: SubaccountSerializedConfig | undefined;
  legacySubaccountConfig: SubaccountSerializedConfig | undefined;
  subaccount: Subaccount | undefined;
  isSubaccountReady: boolean;
  subaccountActivationState: SubaccountActivationState | undefined;
  subaccountActivationError: SubaccountActivationError | undefined;
  subaccountActivationKeySource: SubaccountKeySource | undefined;
  isSubaccountApprovalSkipped: boolean;
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
  const { chainId, srcChainId } = useChainId();
  const signer = useEthersSigner();
  const { account } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);
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

  const [subaccountActivationError, setSubaccountActivationError] = useState<SubaccountActivationError | undefined>(
    undefined
  );
  const [subaccountActivationKeySource, setSubaccountActivationKeySource] = useState<SubaccountKeySource | undefined>(
    undefined
  );
  const [isSubaccountApprovalSkipped, setIsSubaccountApprovalSkipped] = useState(false);

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

  const calcSelector = useCalcSelector();

  // once a signed removal fails, the next attempts use the wallet transaction
  const walletTxnRemovalKeyRef = useRef<string | undefined>(undefined);
  const unknownResultRemovalKeyRef = useRef<string | undefined>(undefined);
  const walletTxnSessionRemovalAddressesRef = useRef<Set<string>>(new Set());

  const removeSubaccountAddresses = useCallback(
    async (subaccountAddresses: string[]) => {
      if (!signer || !account) {
        throw new Error("No signer for subaccount removal");
      }

      if (srcChainId !== undefined) {
        const globalExpressParams = calcSelector(selectExpressGlobalParams);

        if (!globalExpressParams) {
          throw new Error("Missing globalExpressParams for subaccount removal");
        }

        for (const address of subaccountAddresses) {
          await removeSubaccountExpressTxn({
            chainId,
            account,
            srcChainId,
            signer,
            subaccount: { address },
            globalExpressParams,
          });
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

  const removeListedLegacySubaccount = useCallback(
    async (removedSubaccountAddress?: string) => {
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

      if (isListed === false) {
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
        setSubaccountLegacyRemovalState(SubaccountLegacyRemovalState.Failed);
      }
    },
    [account, chainId, removeSubaccountAddresses]
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

  const tryEnableSubaccount = useCallback(
    async ({
      remainingActions,
      remainingSeconds,
      isGmxAccount: isGmxAccountParam,
      withTokenPermits = true,
      passkeyMode,
    }: SubaccountActivationParams = {}) => {
      if (!provider || !signer || !account) {
        return false;
      }

      const passkeyConfigRequest = passkeyMode
        ? generatePasskeySubaccount({ account, chainId, mode: passkeyMode })
        : undefined;

      passkeyConfigRequest?.catch(() => undefined);

      if (await getIsContractAccount(signer.address, chainId)) {
        return false;
      }

      const currentSubaccount = await getCurrentSubaccount();

      if (!passkeyMode && currentSubaccount && getIsSubaccountUsable(currentSubaccount)) {
        return true;
      }

      setSubaccountActivationError(undefined);
      setSubaccountLegacyRemovalState(undefined);
      setSubaccountActivationKeySource(passkeyMode ? "passkey" : "random");
      setIsSubaccountApprovalSkipped(false);

      const toastId = Date.now();

      helperToast.info(<SubaccountActivateNotification toastId={toastId} />, {
        autoClose: false,
        toastId,
      });

      setSubaccountActivationState(SubaccountActivationState.Generating);

      const isGmxAccount = isGmxAccountParam ?? calcSelector(selectTradeboxIsFromTokenGmxAccount);
      const addressBeforeLock = subaccountConfig?.address;
      let isCreatedInThisTab = false;
      let isApprovalSkipped = false;
      let isGenerationFailed = false;

      try {
        await withSubaccountTabLock(chainId, account, async () => {
          const storedConfig = readStoredSubaccountConfig(chainId, account);

          if (
            storedConfig &&
            !getIsLegacySubaccountConfig(storedConfig) &&
            storedConfig.address !== addressBeforeLock &&
            findFallbackSubaccountApproval(chainId, account, storedConfig.address)
          ) {
            return;
          }

          let config: SubaccountSerializedConfig;

          if (passkeyConfigRequest) {
            try {
              config = await passkeyConfigRequest;
            } catch (error) {
              isGenerationFailed = true;
              throw error;
            }

            const onchainData = await getSubaccountOnchainData({
              chainId,
              signer,
              provider,
              subaccountAddress: config.address,
            });

            const listedSubaccount = composeSubaccount({
              chainId,
              srcChainId,
              account,
              config,
              provider: signer.provider ?? undefined,
              onchainData,
              signedApproval: undefined,
              fallbackSignedApproval: undefined,
            });

            isApprovalSkipped = Boolean(listedSubaccount && getIsSubaccountUsable(listedSubaccount));
          } else {
            config = getIsPasskeySubaccountConfig(storedConfig) ? storedConfig : generateSubaccount(account);
          }

          let approval: SignedSubaccountApproval | undefined;

          if (!isApprovalSkipped) {
            setSubaccountActivationState(SubaccountActivationState.ApprovalSigning);

            approval = await getInitialSubaccountApproval({
              chainId,
              signer,
              provider,
              subaccountAddress: config.address,
              isGmxAccount,
              remainingSeconds,
              remainingActions,
            });
          }

          if (storedConfig && getIsLegacySubaccountConfig(storedConfig)) {
            keepLegacySubaccountConfig(chainId, account, storedConfig);
          }

          writeStoredSubaccountConfig(chainId, account, config);
          removeAllStoredSubaccountApprovals(chainId, account);

          if (approval) {
            writeStoredSubaccountApproval(chainId, account, approval);
          }

          isCreatedInThisTab = true;
        });
      } catch (error) {
        setSubaccountActivationState(
          isGenerationFailed
            ? SubaccountActivationState.GeneratingError
            : SubaccountActivationState.ApprovalSigningError
        );
        setSubaccountActivationError({
          message: error?.message,
          walletName: error?.data?.walletName,
          passkeyReason: error instanceof PasskeyError ? error.reason : undefined,
        });
        // eslint-disable-next-line no-console
        console.error(error);
        metrics.pushError(
          error,
          isGenerationFailed ? "subaccount.generatePasskeySubaccount" : "subaccount.signDefaultApproval"
        );
        return false;
      } finally {
        commitStorageChange();
      }

      // a new session starts with the signed removal again, whatever happened to the previous one
      walletTxnRemovalKeyRef.current = undefined;
      unknownResultRemovalKeyRef.current = undefined;

      setIsSubaccountApprovalSkipped(isApprovalSkipped);
      setSubaccountActivationState(SubaccountActivationState.Success);
      refreshSubaccountData();

      if (isCreatedInThisTab) {
        await removeListedLegacySubaccount();
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
              gasPaymentTokenAddress: calcSelector(selectGasPaymentTokenAddress),
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
      removeListedLegacySubaccount,
      signer,
      srcChainId,
      subaccountConfig?.address,
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

      if (getIsLegacySubaccountConfig(subaccountConfig) || !getIsSubaccountUsable(subaccount)) {
        return tryEnableSubaccount({
          remainingActions: nextRemainigActions,
          remainingSeconds: nextRemainingSeconds,
          isGmxAccount: nextIsGmxAccount,
          withTokenPermits: false,
        });
      }

      helperToast.info(
        <StatusNotification key="updateSubaccountSettings" title={t`Update 1CT settings`}>
          <TransactionStatus status="loading" text={t`Updating settings...`} />
        </StatusNotification>
      );

      const isGmxAccount = nextIsGmxAccount ?? calcSelector(selectTradeboxIsFromTokenGmxAccount);

      try {
        const isUpdated = await withSubaccountTabLock(chainId, account, async () => {
          if (readStoredSubaccountConfig(chainId, account)?.address !== subaccount.address) {
            return false;
          }

          const signedSubaccountApproval = await signUpdatedSubaccountSettings({
            chainId,
            signer,
            provider,
            subaccount,
            nextRemainigActions,
            nextRemainingSeconds,
            isGmxAccount,
          });

          setSignedApproval(signedSubaccountApproval);
          return true;
        });

        if (isUpdated) {
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
      }

      toast.dismiss();
      helperToast.error(
        <StatusNotification key="updateSubaccountSettingsError" title={t`Update 1CT settings`}>
          <TransactionStatus status="error" text={t`Settings update failed`} />
        </StatusNotification>
      );
      return false;
    },
    [
      signer,
      subaccount,
      provider,
      account,
      subaccountConfig,
      calcSelector,
      chainId,
      setSignedApproval,
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

      await removeListedLegacySubaccount(subaccount.address);
    };

    try {
      const isAfterUnknownResult = unknownResultRemovalKeyRef.current === removalKey;

      if (!(await getIsSubaccountRemovalRequired({ chainId, subaccount, account, isAfterUnknownResult }))) {
        await finishDeactivation();
        return true;
      }

      if (srcChainId !== undefined) {
        const globalExpressParams = calcSelector(selectExpressGlobalParams);

        if (!globalExpressParams) {
          metrics.pushError(
            new Error("Missing globalExpressParams for subaccount deactivation"),
            "subaccount.tryDisableSubaccount"
          );
          setSubaccountDeactivationFailureReason(SubaccountDeactivationFailureReason.ExpressParamsNotReady);
          setSubaccountDeactivationState(SubaccountDeactivationState.Error);
          return false;
        }

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
          await removeSubaccountSettlementChainExpressTxn({
            chainId,
            signer,
            subaccount,
            expressParams: settlementChainExpressParams,
          });
        } else {
          await removeSubaccountWalletTxn(chainId, signer, subaccount.address);
        }
      }

      await finishDeactivation();
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      metrics.pushError(error, "subaccount.tryDisableSubaccount");

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
    removeListedLegacySubaccount,
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

      try {
        await removeSubaccountAddresses(subaccountAddresses);

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
        helperToast.error(
          <StatusNotification key="removeSubaccountSessionsError" title={t`Remove 1CT sessions`}>
            <TransactionStatus status="error" text={t`Removal failed`} />
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

  const isSubaccountReady = Boolean(signer?.address) && (!subaccountConfig || Boolean(subaccountData));

  const state: SubaccountState = useMemo(() => {
    return {
      subaccountConfig,
      legacySubaccountConfig,
      subaccount,
      isSubaccountReady,
      subaccountActivationState,
      subaccountActivationError,
      subaccountActivationKeySource,
      isSubaccountApprovalSkipped,
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
    subaccountConfig,
    legacySubaccountConfig,
    subaccount,
    isSubaccountReady,
    subaccountActivationState,
    subaccountActivationError,
    subaccountActivationKeySource,
    isSubaccountApprovalSkipped,
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

  return <TransactionStatus status="error" text={t`Old session is still active. Remove it in One-Click sessions`} />;
}

function SubaccountActivateNotification({ toastId }: { toastId: number }) {
  const { chainId } = useChainId();
  const {
    subaccountActivationState,
    subaccountActivationError,
    subaccountActivationKeySource,
    isSubaccountApprovalSkipped,
    subaccountLegacyRemovalState,
  } = useSubaccountContext();
  const isPasskey = subaccountActivationKeySource === "passkey";

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

  const isGeneratingError = subaccountActivationState === SubaccountActivationState.GeneratingError;
  const hasError = subaccountActivationState === SubaccountActivationState.ApprovalSigningError || isGeneratingError;

  const isCompleted =
    (subaccountActivationState === SubaccountActivationState.Success &&
      subaccountLegacyRemovalState !== SubaccountLegacyRemovalState.Removing) ||
    hasError;

  const generatingStatus = useMemo(() => {
    let text = isPasskey ? t`Confirm with your passkey...` : t`Generating session...`;
    let status: TransactionStatusType = "loading";

    if (isGeneratingError) {
      status = "error";
      text = t`Passkey failed`;
    } else if (subaccountActivationState && subaccountActivationState >= SubaccountActivationState.ApprovalSigning) {
      status = "success";
      text = isPasskey ? t`Passkey confirmed` : t`Session generated`;
    }

    return <TransactionStatus status={status} text={text} />;
  }, [isGeneratingError, isPasskey, subaccountActivationState]);

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
      text = isSubaccountApprovalSkipped ? t`Session is already active, no approval needed` : t`Approval signed`;
    }

    return <TransactionStatus status={status} text={text} />;
  }, [isSubaccountApprovalSkipped, subaccountActivationState]);

  const passkeyErrorText = isGeneratingError
    ? getPasskeyErrorText(subaccountActivationError?.passkeyReason) ?? subaccountActivationError?.message
    : undefined;

  useEffect(
    function cleanup() {
      // Actionable errors stay until dismissed — they carry a link to follow.
      if (isCompleted && !errorContent && !dismissTimerId.current) {
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
    [isCompleted, subaccountActivationState, errorContent, toastId]
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
      {passkeyErrorText && <div className="mt-8">{passkeyErrorText}</div>}
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
      if (isCompleted && !dismissTimerId.current) {
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
        }
      };
    },
    [hasError, isCompleted, subaccountDeactivationState, toastId]
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
