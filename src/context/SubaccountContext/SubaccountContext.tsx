import { Trans } from "@lingui/macro";
import DataStore from "abis/DataStore.json";
import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, NETWORK_EXECUTION_TO_CREATE_FEE_FACTOR } from "config/chains";
import { getContract } from "config/contracts";
import {
  SUBACCOUNT_ORDER_ACTION,
  maxAllowedSubaccountActionCountKey,
  subaccountActionCountKey,
  subaccountAutoTopUpAmountKey,
  subaccountListKey,
} from "config/dataStore";
import { getSubaccountConfigKey } from "config/localStorage";
import { getNativeToken, getWrappedToken } from "config/tokens";
import cryptoJs from "crypto-js";
import { useTransactionPending } from "domain/synthetics/common/useTransactionReceipt";
import {
  estimateExecuteIncreaseOrderGasLimit,
  getExecutionFee,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import { STRING_FOR_SIGNING } from "domain/synthetics/subaccount/constants";
import { SubaccountSerializedConfig } from "domain/synthetics/subaccount/types";
import { useTokenBalances, useTokensDataRequest } from "domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useMulticall } from "lib/multicall";
import { applyFactor } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getProvider } from "lib/rpc";
import useWallet from "lib/wallets/useWallet";
import { Context, PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";
import { createContext, useContextSelector } from "use-context-selector";

export type Subaccount = ReturnType<typeof useSubaccount>;

export type SubaccountNotificationState =
  | "generating"
  | "activating"
  | "activated"
  | "activationFailed"
  | "generationFailed"
  | "deactivating"
  | "deactivated"
  | "deactivationFailed"
  | "none";

export type SubaccountContext = {
  activeTx: string | null;
  defaultExecutionFee: BigNumber | null;
  defaultNetworkFee: BigNumber | null;
  contractData: {
    isSubaccountActive: boolean;
    maxAllowedActions: BigNumber;
    currentActionsCount: BigNumber;
    currentAutoTopUpAmount: BigNumber;
  } | null;
  subaccount: {
    address: string;
    privateKey: string;
  } | null;
  modalOpen: boolean;
  notificationState: SubaccountNotificationState;

  clearSubaccount: () => void;
  generateSubaccount: () => Promise<string | null>;
  setActiveTx: (tx: string | null) => void;
  setModalOpen: (v: boolean) => void;
  setNotificationState: (state: SubaccountNotificationState) => void;
  refetchContractData: () => void;
};

const context = createContext<SubaccountContext | null>(null);

// TODO gmxer: refactor this in chains.ts so that new networks are required
function getFactorByChainId(chainId: number) {
  switch (chainId) {
    case ARBITRUM:
    case AVALANCHE_FUJI:
    case AVALANCHE:
      return NETWORK_EXECUTION_TO_CREATE_FEE_FACTOR[chainId];

    default:
      throw new Error(`Unsupported chainId ${chainId}`);
  }
}

export function SubaccountContextProvider({ children }: PropsWithChildren) {
  const [modalOpen, setModalOpen] = useState(false);
  const [notificationState, setNotificationState] = useState<SubaccountNotificationState>("none");

  const { signer, account } = useWallet();
  const { chainId } = useChainId();
  const [config, setConfig] = useLocalStorageSerializeKey<SubaccountSerializedConfig>(
    getSubaccountConfigKey(chainId, account),
    null
  );

  const gasPrice = useGasPrice(chainId);
  const gasLimits = useGasLimits(chainId);
  const { tokensData } = useTokensDataRequest(chainId);

  // fee that is used as a approx basis to calculate
  // costs of subaccount actions
  const [defaultExecutionFee, defaultNetworkFee] = useMemo(() => {
    if (!gasLimits || !tokensData || !gasPrice) return [null, null];

    const approxNetworkGasLimit = applyFactor(
      applyFactor(gasLimits.estimatedFeeBaseGasLimit, gasLimits.estimatedFeeMultiplierFactor),
      getFactorByChainId(chainId)
    )
      // createOrder is smaller than executeOrder
      // L2 Gas
      .add(800_000);
    const networkFee = approxNetworkGasLimit.mul(gasPrice);

    const gasLimit = estimateExecuteIncreaseOrderGasLimit(gasLimits, {
      swapsCount: 1,
    });

    const executionFee =
      getExecutionFee(chainId, gasLimits, tokensData, gasLimit, gasPrice)?.feeTokenAmount ?? BigInt(0);
    return [executionFee, networkFee];
  }, [chainId, gasLimits, gasPrice, tokensData]);

  const generateSubaccount = useCallback(async () => {
    if (!account) throw new Error("Account is not set");

    const signature = await signer?.signMessage(STRING_FOR_SIGNING);

    if (!signature) return null;

    const pk = ethers.keccak256(signature);
    const subWallet = new ethers.Wallet(pk);

    const encrypted = cryptoJs.AES.encrypt(pk, account);

    setConfig({
      privateKey: encrypted.toString(),
      address: subWallet.address,
    });

    return subWallet.address;
  }, [account, setConfig, signer]);

  const clearSubaccount = useCallback(() => {
    setConfig(null);
  }, [setConfig]);

  const [activeTx, setActiveTx] = useState<string | null>(null);
  const [contractData, setContractData] = useState<SubaccountContext["contractData"] | null>(null);
  const isTxPending = useTransactionPending(activeTx);

  const {
    data: fetchedContractData,
    isLoading,
    mutate: refetchContractData,
  } = useMulticall(chainId, "useSubaccountsFromContracts", {
    key:
      account && config?.address ? [account, config.address, activeTx, isTxPending ? "pending" : "not-pending"] : null,
    request: () => {
      return {
        dataStore: {
          contractAddress: getContract(chainId, "DataStore"),
          abi: DataStore.abi,
          calls: {
            isSubaccountActive: {
              methodName: "containsAddress",
              params: [subaccountListKey(account!), config!.address],
            },
            maxAllowedActionsCount: {
              methodName: "getUint",
              params: [maxAllowedSubaccountActionCountKey(account!, config!.address, SUBACCOUNT_ORDER_ACTION)],
            },
            currentActionsCount: {
              methodName: "getUint",
              params: [subaccountActionCountKey(account!, config!.address, SUBACCOUNT_ORDER_ACTION)],
            },
            currentAutoTopUpAmount: {
              methodName: "getUint",
              params: [subaccountAutoTopUpAmountKey(account!, config!.address)],
            },
          },
        },
      };
    },
    parseResponse: (res) => {
      const isSubaccountActive = Boolean(res.data.dataStore.isSubaccountActive.returnValues[0]);
      const maxAllowedActions = BigInt(res.data.dataStore.maxAllowedActionsCount.returnValues[0]);
      const currentActionsCount = BigInt(res.data.dataStore.currentActionsCount.returnValues[0]);
      const currentAutoTopUpAmount = BigInt(res.data.dataStore.currentAutoTopUpAmount.returnValues[0]);

      return { isSubaccountActive, maxAllowedActions, currentActionsCount, currentAutoTopUpAmount };
    },
  });

  useEffect(() => {
    if (isLoading) return;

    setContractData(fetchedContractData ?? null);
  }, [fetchedContractData, isLoading]);

  const value: SubaccountContext = useMemo(() => {
    return {
      modalOpen,
      setModalOpen,
      defaultExecutionFee,
      defaultNetworkFee,
      subaccount: config
        ? {
            address: config.address,
            privateKey: config.privateKey,
          }
        : null,
      contractData: config && contractData ? contractData : null,
      refetchContractData,
      generateSubaccount,
      clearSubaccount,
      notificationState,
      activeTx,
      setActiveTx,
      setNotificationState,
    };
  }, [
    activeTx,
    clearSubaccount,
    config,
    contractData,
    refetchContractData,
    defaultExecutionFee,
    defaultNetworkFee,
    generateSubaccount,
    modalOpen,
    notificationState,
  ]);

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useSubaccountSelector<Selected>(selector: (s: SubaccountContext) => Selected) {
  return useContextSelector(context as Context<SubaccountContext>, selector) as Selected;
}

export function useSubaccountModalOpen() {
  return [useSubaccountSelector((s) => s.modalOpen), useSubaccountSelector((s) => s.setModalOpen)] as const;
}

export function useSubaccountGenerateSubaccount() {
  return useSubaccountSelector((s) => s.generateSubaccount);
}

export function useSubaccountState() {
  return useSubaccountSelector((s) => s);
}

export function useSubaccountAddress() {
  return useSubaccountSelector((s) => s.subaccount?.address ?? null);
}

function useSubaccountPrivateKey() {
  const encryptedString = useSubaccountSelector((s) => s.subaccount?.privateKey ?? null);
  const { account } = useWallet();
  return useMemo(() => {
    if (!account || !encryptedString) return null;

    // race condition when switching accounts:
    // account is already another address
    // while the encryptedString is still from the previous account
    try {
      return cryptoJs.AES.decrypt(encryptedString, account).toString(cryptoJs.enc.Utf8);
    } catch (e) {
      return null;
    }
  }, [account, encryptedString]);
}

export function useIsSubaccountActive() {
  const pkAvailable = useSubaccountPrivateKey() !== null;
  return useSubaccountSelector((s) => s.contractData?.isSubaccountActive ?? false) && pkAvailable;
}

export function useSubaccountDefaultExecutionFee() {
  return useSubaccountSelector((s) => s.defaultExecutionFee) ?? BigInt(0);
}

function useSubaccountDefaultNetworkFee() {
  return useSubaccountSelector((s) => s.defaultNetworkFee) ?? BigInt(0);
}

export function useSubaccount(requiredBalance: BigNumber | null, requiredActions = 1) {
  const address = useSubaccountAddress();
  const active = useIsSubaccountActive();
  const privateKey = useSubaccountPrivateKey();
  const { chainId } = useChainId();
  const defaultExecutionFee = useSubaccountDefaultExecutionFee();
  const insufficientFunds = useSubaccountInsufficientFunds(requiredBalance ?? defaultExecutionFee);

  const { remaining } = useSubaccountActionCounts();

  return useMemo(() => {
    if (!address || !active || !privateKey || insufficientFunds || remaining?.lt(Math.max(1, requiredActions)))
      return null;

    const provider = getProvider(undefined, chainId);
    const wallet = new ethers.Wallet(privateKey, provider);
    const signer = wallet.connect(provider);

    return {
      address,
      active,
      signer,
      wallet,
    };
  }, [address, active, privateKey, insufficientFunds, remaining, requiredActions, chainId]);
}

export function useSubaccountInsufficientFunds(requiredBalance: BigNumber | undefined | null) {
  const { chainId } = useChainId();
  const subaccountAddress = useSubaccountAddress();
  const subBalances = useTokenBalances(chainId, subaccountAddress ?? undefined);
  const nativeToken = useMemo(() => getNativeToken(chainId), [chainId]);
  const nativeTokenBalance = getByKey(subBalances.balancesData, nativeToken.address);
  const isSubaccountActive = useIsSubaccountActive();
  const defaultExecutionFee = useSubaccountDefaultExecutionFee();
  const networkFee = useSubaccountDefaultNetworkFee();
  const required = (requiredBalance ?? defaultExecutionFee ?? BigInt(0)).add(networkFee);

  if (!isSubaccountActive) return false;
  if (!nativeTokenBalance) return false;

  return required.gt(nativeTokenBalance);
}

export function useMainAccountInsufficientFunds(requiredBalance: BigNumber | undefined | null) {
  const { chainId } = useChainId();
  const { account: address } = useWallet();
  const balances = useTokenBalances(chainId, address);
  const wrappedToken = useMemo(() => getWrappedToken(chainId), [chainId]);
  const wntBalance = getByKey(balances.balancesData, wrappedToken.address);
  const isSubaccountActive = useIsSubaccountActive();
  const networkFee = useSubaccountDefaultNetworkFee();
  const defaultExecutionFee = useSubaccountDefaultExecutionFee();
  const required = (requiredBalance ?? defaultExecutionFee).add(networkFee);

  if (!isSubaccountActive) return false;
  if (!wntBalance) return false;

  return required.gt(wntBalance);
}

export function useSubaccountActionCounts() {
  const current = useSubaccountSelector((s) => s.contractData?.currentActionsCount ?? null);
  const max = useSubaccountSelector((s) => s.contractData?.maxAllowedActions ?? null);
  const remaining = max?.sub(current ?? 0) ?? null;

  return {
    current,
    max,
    remaining,
  };
}

export function useSubaccountPendingTx() {
  return [useSubaccountSelector((s) => s.activeTx), useSubaccountSelector((s) => s.setActiveTx)] as const;
}

export function useIsLastSubaccountAction(requiredActions = 1) {
  const { remaining } = useSubaccountActionCounts();
  return remaining?.eq(Math.max(requiredActions, 1)) ?? false;
}

export function useSubaccountCancelOrdersDetailsMessage(
  overridedRequiredBalance: BigNumber | undefined,
  actionCount: number
) {
  const defaultRequiredBalance = useSubaccountDefaultExecutionFee();
  const requiredBalance = overridedRequiredBalance ?? defaultRequiredBalance;
  const isLastAction = useIsLastSubaccountAction(actionCount);
  const subaccountInsufficientFunds = useSubaccountInsufficientFunds(requiredBalance);
  const [, setOpenSubaccountModal] = useSubaccountModalOpen();
  const refetchContractData = useSubaccountRefetchContractData();
  const handleOpenSubaccountModal = useCallback(() => {
    setOpenSubaccountModal(true);
    refetchContractData();
  }, [setOpenSubaccountModal, refetchContractData]);

  return useMemo(() => {
    if (isLastAction) {
      return (
        <Trans>
          Max Action Count Reached.{" "}
          <span onClick={handleOpenSubaccountModal} className="link-underline">
            Click here
          </span>{" "}
          to update.
        </Trans>
      );
    } else if (subaccountInsufficientFunds) {
      return (
        <Trans>
          There are insufficient funds in your Subaccount for One-Click Trading.{" "}
          <span onClick={handleOpenSubaccountModal} className="link-underline">
            Click here
          </span>{" "}
          to top-up.
        </Trans>
      );
    }

    return null;
  }, [isLastAction, handleOpenSubaccountModal, subaccountInsufficientFunds]);
}

export function useSubaccountNotificationState() {
  return [
    useSubaccountSelector((s) => s.notificationState),
    useSubaccountSelector((s) => s.setNotificationState),
  ] as const;
}

export function useSubaccountRefetchContractData() {
  return useSubaccountSelector((s) => s.refetchContractData);
}
