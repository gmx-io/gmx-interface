import { t } from "@lingui/macro";
import { Contract } from "ethers";
import React, { createContext, useCallback, useContext, useMemo } from "react";
import { toast } from "react-toastify";

import { getSwapDebugSettings } from "config/externalSwaps";
import { getSubaccountApprovalKey, getSubaccountConfigKey } from "config/localStorage";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectMarketsInfoData, selectTokensData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useCalcSelector } from "context/SyntheticsStateContext/utils";
import {
  getExpressContractAddress,
  getOracleParamsPayload,
  getOraclePriceParamsForRelayFee,
  getRelayerFeeParams,
  MultichainRelayParamsPayload,
} from "domain/synthetics/express";
import { buildAndSignRemoveSubaccountTxn, removeSubaccountWalletTxn } from "domain/synthetics/subaccount";
import { generateSubaccount } from "domain/synthetics/subaccount/generateSubaccount";
import { SignedSubbacountApproval, Subaccount, SubaccountSerializedConfig } from "domain/synthetics/subaccount/types";
import { useSubaccountOnchainData } from "domain/synthetics/subaccount/useSubaccountOnchainData";
import {
  getActualApproval,
  getInitialSubaccountApproval,
  getSubaccountSigner,
  signUpdatedSubaccountSettings,
} from "domain/synthetics/subaccount/utils";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { metrics } from "lib/metrics";
import { getByKey } from "lib/objects";
import { useJsonRpcProvider } from "lib/rpc";
import { sleep } from "lib/sleep";
import { sendExpressTransaction } from "lib/transactions";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
import { expandDecimals, USD_DECIMALS } from "sdk/utils/numbers";
import { ExternalCallsPayload } from "sdk/utils/orderTransactions";
import { getSwapAmountsByToValue } from "sdk/utils/swap";
import { convertToTokenAmount } from "sdk/utils/tokens";
import { SubaccountGelatoRelayRouter } from "typechain-types";
import { MultichainSubaccountRouter } from "typechain-types-arbitrum-sepolia";

import { StatusNotification } from "components/Synthetics/StatusNotification/StatusNotification";
import { TransactionStatus } from "components/TransactionStatus/TransactionStatus";

export type SubaccountState = {
  subaccountConfig: SubaccountSerializedConfig | undefined;
  subaccount: Subaccount | undefined;
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
  const { chainId, srcChainId } = useChainId();
  const signer = useEthersSigner();
  const { account } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);

  const {
    subaccountConfig,
    signedApproval,
    setSubaccountConfig,
    setSignedApproval,
    resetStoredApproval,
    resetStoredConfig,
  } = useStoredSubaccountData(chainId, signer?.address);

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

    return {
      address: subaccountConfig.address,
      signer: subaccountSigner,
      onchainData: subaccountData,
      signedApproval: getActualApproval({
        address: subaccountConfig.address,
        onchainData: subaccountData,
        signedApproval,
        isMultichain: srcChainId !== undefined,
      }),
    };
  }, [signedApproval, signer?.address, signer?.provider, srcChainId, subaccountConfig, subaccountData]);

  const updateSubaccountSettings = useCallback(
    async function updateSubaccountSettings({
      nextRemainigActions,
      nextRemainingSeconds,
    }: {
      nextRemainigActions?: bigint;
      nextRemainingSeconds?: bigint;
    }) {
      if (!signer || !subaccount?.address || !provider) {
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
          provider,
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
    [signer, subaccount, provider, chainId, setSignedApproval]
  );

  const resetSubaccountApproval = useCallback(() => {
    setSignedApproval(undefined);
    refreshSubaccountData();
  }, [refreshSubaccountData, setSignedApproval]);

  const tryEnableSubaccount = useCallback(async () => {
    if (!provider || !signer) {
      return false;
    }

    let config = subaccountConfig;

    if (!config?.address || !config.isNew) {
      try {
        helperToast.success(
          <StatusNotification key="generateSubaccount" title={t`Generating 1CT (One-Click Trading) session`}>
            <TransactionStatus status="loading" text={t`Generating session...`} />
          </StatusNotification>
        );

        config = await generateSubaccount(signer);

        setSubaccountConfig(config);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);

        helperToast.error(
          <StatusNotification key="generateSubaccountError" title={t`Generate 1CT (One-Click Trading) session`}>
            <TransactionStatus status="error" text={t`Failed to generate session`} />
          </StatusNotification>
        );
        metrics.pushError(error, "subaccount.generateSubaccount");
        return false;
      }
    }

    if (!config.address) {
      const error = "Missed subaccount config";
      // eslint-disable-next-line no-console
      console.error(error);
      await sleep(1).then(() =>
        helperToast.error(
          <StatusNotification key="generateSubaccountError" title={t`Generate 1CT (One-Click Trading) session`}>
            <TransactionStatus status="error" text={t`Failed to generate session`} />
          </StatusNotification>
        )
      );

      metrics.pushError(error, "subaccount.missedSubaccountConfigAfterGeneration");
      resetStoredConfig();
      return false;
    }

    try {
      helperToast.success(
        <StatusNotification key="signDefaultApproval" title={t`Signing 1CT (One-Click Trading) approval`}>
          <TransactionStatus status="loading" text={t`Signing approval...`} />
        </StatusNotification>
      );

      const defaultSubaccountApproval = await getInitialSubaccountApproval({
        chainId,
        signer,
        provider,
        subaccountAddress: config!.address,
      });

      helperToast.success(
        <StatusNotification key="signDefaultApprovalSuccess" title={t`Signing 1CT (One-Click Trading) approval`}>
          <TransactionStatus status="success" text={t`Approval signed`} />
        </StatusNotification>
      );

      setSignedApproval(defaultSubaccountApproval);

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      // toast.dismiss(toastId);
      metrics.pushError(error, "subaccount.signDefaultApproval");
      helperToast.error(
        <StatusNotification key="signDefaultApprovalError" title={t`Signing 1CT (One-Click Trading) approval`}>
          <TransactionStatus status="error" text={t`Failed to sign approval`} />
        </StatusNotification>
      );
      return false;
    }
  }, [provider, signer, subaccountConfig, setSubaccountConfig, resetStoredConfig, chainId, setSignedApproval]);

  const calcSelector = useCalcSelector();

  const tryDisableSubaccount = useCallback(async () => {
    if (!signer || !subaccount?.address) {
      return false;
    }

    helperToast.success(
      <StatusNotification title={t`Deactivate 1CT (One-Click Trading)`}>
        <TransactionStatus status="loading" text={t`Deactivating...`} />
      </StatusNotification>
    );

    let removeSubaccount: () => Promise<void>;

    if (srcChainId) {
      removeSubaccount = async () => {
        const marketsInfoData = calcSelector(selectMarketsInfoData);
        const tokensData = calcSelector(selectTokensData);
        const expressGlobalParams = calcSelector(selectExpressGlobalParams);

        if (!marketsInfoData || !tokensData || !account || !expressGlobalParams) {
          throw new Error("No markets info data or tokens data");
        }

        const relayerFeeToken = getByKey(tokensData, expressGlobalParams.relayerFeeTokenAddress);
        const gasPaymentToken = getByKey(tokensData, expressGlobalParams.gasPaymentTokenAddress);

        if (!relayerFeeToken || !gasPaymentToken) {
          throw new Error("No relayer fee token");
        }

        const relayRouterAddress = getExpressContractAddress(chainId, {
          isSubaccount: true,
          isMultichain: srcChainId !== undefined,
          scope: "subaccount",
        });

        const relayRouterInstance = new Contract(
          relayRouterAddress,
          abis.AbstractUserNonceable,
          provider
        ) as unknown as SubaccountGelatoRelayRouter | MultichainSubaccountRouter;

        const userNonce = await relayRouterInstance.userNonces(account);
        const externalCalls: ExternalCallsPayload = {
          sendTokens: [],
          sendAmounts: [],
          externalCallTargets: [],
          externalCallDataList: [],
          refundTokens: [],
          refundReceivers: [],
        };

        const baseRelayerFeeAmount = convertToTokenAmount(
          expandDecimals(1, USD_DECIMALS - 2),
          relayerFeeToken.decimals,
          relayerFeeToken.prices.maxPrice
        )!;

        const swapAmounts = getSwapAmountsByToValue({
          tokenIn: gasPaymentToken,
          tokenOut: relayerFeeToken,
          amountOut: baseRelayerFeeAmount,
          isLimit: false,
          findSwapPath: expressGlobalParams.findSwapPath,
          uiFeeFactor: 0n,
        });

        const baseRelayFeeSwapParams = getRelayerFeeParams({
          chainId: chainId,
          account: account,
          relayerFeeTokenAmount: baseRelayerFeeAmount,
          totalNetworkFeeAmount: baseRelayerFeeAmount,
          relayerFeeTokenAddress: relayerFeeToken.address,
          gasPaymentTokenAddress: gasPaymentToken.address,
          internalSwapAmounts: swapAmounts,
          feeExternalSwapQuote: undefined,
          tokenPermits: [],
          batchExternalCalls: {
            sendTokens: [],
            sendAmounts: [],
            externalCallTargets: [],
            externalCallDataList: [],
            refundTokens: [],
            refundReceivers: [],
          },
          tokensData,
          forceExternalSwaps: getSwapDebugSettings()?.forceExternalSwaps ?? false,
          // TODO: fix
          gasPrice: 0n,
          l1GasLimit: 0n,
          relayerGasLimit: 0n,
        });

        if (baseRelayFeeSwapParams === undefined) {
          throw new Error("No base relay fee swap params");
        }

        // const relayParamsPayload: RelayParamsPayload = {};
        const relayParamsPayload: MultichainRelayParamsPayload = {
          oracleParams: getOracleParamsPayload(
            getOraclePriceParamsForRelayFee({
              chainId: chainId,
              marketsInfoData,
              tokensData,

              relayFeeParams: baseRelayFeeSwapParams,
            })
          ),
          tokenPermits: [],
          externalCalls,
          fee: {
            feeToken: baseRelayFeeSwapParams.gasPaymentTokenAddress,
            feeAmount: baseRelayFeeSwapParams.totalNetworkFeeAmount,
            feeSwapPath: [],
          },
          userNonce: userNonce,
          deadline: 9999999999999n,
          desChainId: BigInt(chainId),
        };
        const txnData = await buildAndSignRemoveSubaccountTxn({
          chainId,
          signer,
          subaccount,
          relayParamsPayload,
        });

        await sendExpressTransaction({
          chainId,
          isSponsoredCall: false,
          txnData,
        });
      };
    } else {
      removeSubaccount = () => removeSubaccountWalletTxn(chainId, signer, subaccount.address);
    }

    try {
      await removeSubaccount();

      helperToast.success(
        <StatusNotification title={t`Deactivate 1CT (One-Click Trading)`}>
          <TransactionStatus status="success" text={t`Deactivated`} />
        </StatusNotification>
      );

      resetStoredApproval();
      resetStoredConfig();
      refreshSubaccountData();
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      metrics.pushError(error, "subaccount.tryDisableSubaccount");
      helperToast.error(
        <StatusNotification title={t`Deactivate 1CT (One-Click Trading)`}>
          <TransactionStatus status="error" text={t`Failed to deactivate`} />
        </StatusNotification>
      );
      return false;
    }
  }, [
    signer,
    subaccount,
    srcChainId,
    calcSelector,
    account,
    chainId,
    provider,
    resetStoredApproval,
    resetStoredConfig,
    refreshSubaccountData,
  ]);

  const state: SubaccountState = useMemo(() => {
    return {
      subaccountConfig,
      subaccount,
      updateSubaccountSettings,
      resetSubaccountApproval,
      tryEnableSubaccount,
      tryDisableSubaccount,
      refreshSubaccountData,
    };
  }, [
    subaccount,
    subaccountConfig,
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
            // TODO: what nonce is this?
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
