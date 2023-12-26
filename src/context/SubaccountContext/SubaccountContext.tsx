import DataStore from "abis/DataStore.json";
import { getContract } from "config/contracts";
import {
  SUBACCOUNT_ORDER_ACTION,
  maxAllowedSubaccountActionCountKey,
  subaccountActionCountKey,
  subaccountAutoTopUpAmountKey,
  subaccountListKey,
} from "config/dataStore";
import { getSubaccountConfigKey } from "config/localStorage";
import { getNativeToken } from "config/tokens";
import {
  ExecutionFee,
  estimateExecuteIncreaseOrderGasLimit,
  getExecutionFee,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import { getStringForSign } from "domain/synthetics/subaccount/onClickTradingUtils";
import { SubaccountSerializedConfig } from "domain/synthetics/subaccount/types";
import { useTokenBalances, useTokensData } from "domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useMulticall } from "lib/multicall";
import { getByKey } from "lib/objects";
import { getProvider } from "lib/rpc";
import useWallet from "lib/wallets/useWallet";
import { Context, PropsWithChildren, useCallback, useMemo, useState } from "react";
import { createContext, useContextSelector } from "use-context-selector";

export type Subaccount = ReturnType<typeof useSubaccount>;

export type SubaccountContext = {
  subaccount: {
    address: string;
    privateKey: string;
  } | null;
  contractData: {
    isSubaccountActive: boolean;
    maxAllowedActions: BigNumber;
    currentActionsCount: BigNumber;
    currentAutoTopUpAmount: BigNumber;
  } | null;
  modalOpen: boolean;
  baseExecutionFee: ExecutionFee | null;
  setModalOpen: (v: boolean) => void;
  generateSubaccount: () => Promise<void>;
  clearSubaccount: () => void;
};

const context = createContext<SubaccountContext | null>(null);

export function SubaccountContextProvider({ children }: PropsWithChildren) {
  const [modalOpen, setModalOpen] = useState(false);

  const { signer, account } = useWallet();
  const { chainId } = useChainId();
  const [config, setConfig] = useLocalStorageSerializeKey<SubaccountSerializedConfig>(
    getSubaccountConfigKey(chainId, account),
    null
  );

  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const { tokensData } = useTokensData(chainId);

  // execution fee that is used as a basis to calculate
  // costs of subaccount actions
  const baseExecutionFee = useMemo(() => {
    if (!gasLimits || !tokensData || !gasPrice) return null;
    const estimatedGas = estimateExecuteIncreaseOrderGasLimit(gasLimits, {
      swapsCount: 3,
    });
    return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
  }, [chainId, gasLimits, gasPrice, tokensData]);

  const generateSubaccount = useCallback(async () => {
    const signature = await signer?.signMessage(getStringForSign());

    if (!signature) return;

    const pk = ethers.utils.keccak256(signature);
    const subWallet = new ethers.Wallet(pk);

    setConfig({
      privateKey: pk,
      address: subWallet.address,
    });
  }, [setConfig, signer]);

  const clearSubaccount = useCallback(() => {
    setConfig(null);
  }, [setConfig]);

  const { data: contractData } = useMulticall(chainId, "useSubaccountsFromContracts", {
    key: account && config?.address ? [account, config.address] : null,
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
      const maxAllowedActions = BigNumber.from(res.data.dataStore.maxAllowedActionsCount.returnValues[0]);
      const currentActionsCount = BigNumber.from(res.data.dataStore.currentActionsCount.returnValues[0]);
      const currentAutoTopUpAmount = BigNumber.from(res.data.dataStore.currentAutoTopUpAmount.returnValues[0]);

      return { isSubaccountActive, maxAllowedActions, currentActionsCount, currentAutoTopUpAmount };
    },
  });

  const value: SubaccountContext = useMemo(() => {
    return {
      modalOpen,
      setModalOpen,
      baseExecutionFee: baseExecutionFee ?? null,
      subaccount: config
        ? {
            address: config.address,
            privateKey: config.privateKey,
          }
        : null,
      contractData: config && contractData ? contractData : null,
      generateSubaccount,
      clearSubaccount,
    };
  }, [baseExecutionFee, clearSubaccount, config, contractData, generateSubaccount, modalOpen]);

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useSubaccountSelector<Selected>(selector: (s: SubaccountContext) => Selected) {
  return useContextSelector(context as Context<SubaccountContext>, selector);
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
  return useSubaccountSelector((s) => s.subaccount?.privateKey ?? null);
}

export function useIsSubaccountActive() {
  return useSubaccountSelector((s) => s.contractData?.isSubaccountActive ?? false);
}

function useSubaccountBaseExecutionFeeTokenAmount() {
  return useSubaccountSelector((s) => s.baseExecutionFee?.feeTokenAmount);
}

export function useSubaccount(requiredBalance: BigNumber | null) {
  const address = useSubaccountAddress();
  const active = useIsSubaccountActive();
  const privateKey = useSubaccountPrivateKey();
  const { chainId } = useChainId();
  const defaultRequiredBalance = useSubaccountBaseExecutionFeeTokenAmount();
  const insufficientFunds = useSubaccountInsufficientFunds(requiredBalance ?? defaultRequiredBalance);

  const { remaining } = useSubaccountActionCounts();

  return useMemo(() => {
    if (!address || !active || !privateKey || insufficientFunds || remaining?.eq(0)) return null;

    const wallet = new ethers.Wallet(privateKey);
    const provider = getProvider(undefined, chainId);
    const signer = wallet.connect(provider);

    return {
      address,
      active,
      signer,
    };
  }, [address, active, privateKey, insufficientFunds, remaining, chainId]);
}

export function useSubaccountInsufficientFunds(requiredBalance: BigNumber | undefined) {
  const { chainId } = useChainId();
  const subaccountAddress = useSubaccountAddress();
  const subBalances = useTokenBalances(chainId, subaccountAddress ?? undefined);
  const nativeToken = useMemo(() => getNativeToken(chainId), [chainId]);
  const subAccEthBalance = getByKey(subBalances.balancesData, nativeToken.address);
  const isSubaccountActive = useIsSubaccountActive();

  if (!requiredBalance) return false;
  if (!isSubaccountActive) return false;
  if (!subAccEthBalance) return false;

  return requiredBalance.gt(subAccEthBalance);
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

export function useIsLastSubaccountAction() {
  const { remaining } = useSubaccountActionCounts();
  return remaining?.eq(1) ?? false;
}
