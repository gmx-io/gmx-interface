import { Trans } from "@lingui/macro";
import { useCallback, useMemo } from "react";
import { ImSpinner2 } from "react-icons/im";
import Skeleton from "react-loading-skeleton";
import { useLocalStorage } from "react-use";
import useSWR from "swr";
import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import useUserClaimableAmounts, { GLP_DISTRIBUTION_ID } from "domain/synthetics/common/useUserClaimableAmounts";
import { estimateExecutionGasPrice, getExecutionFeeBufferBps } from "domain/synthetics/fees/utils/executionFee";
import { useTokenBalances } from "domain/synthetics/tokens";
import { getGasPrice } from "lib/gas/gasPrice";
import { helperToast } from "lib/helperToast";
import { formatAmount, formatUsd } from "lib/numbers";
import { sendWalletTransaction, TxnEventName } from "lib/transactions";
import { WalletSigner } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import ClaimHandlerAbi from "sdk/abis/ClaimHandler.json";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";

function getCallData(tokens: string[], account: string, signature: string, distributionId: bigint) {
  const params = tokens.map((token) => ({
    token,
    distributionId,
    termsSignature: signature as `0x${string}`,
  }));

  return encodeFunctionData({
    abi: ClaimHandlerAbi.abi,
    functionName: "claimFunds",
    args: [params, account],
  });
}

function createClaimAmountsTransaction(data: {
  tokens: string[];
  chainId: number;
  signer: WalletSigner;
  account: string;
  signature: string;
  distributionId: bigint;
  amounts: Record<string, string>;
}) {
  const { tokens, chainId, signer, account, signature, distributionId, amounts } = data;
  const callData = getCallData(tokens, account, signature, distributionId);

  return sendWalletTransaction({
    chainId,
    signer,
    to: getContract(chainId, "ClaimHandler"),
    callData,
    value: 0n,
    callback: async (event) => {
      switch (event.event) {
        case TxnEventName.Submitted:
          helperToast.success(
            <div className="flex flex-col gap-10">
              <div className="text-body-medium font-bold">
                <Trans>Processing your claim…</Trans>
              </div>
              <div className="flex flex-row gap-10  text-gray-500">
                <Trans>This may take a few minutes.</Trans>
                <ImSpinner2 width={60} height={60} className="spin size-15 text-white" />
              </div>
            </div>
          );

          return;
        case TxnEventName.Error:
          helperToast.error(
            <div className="flex flex-col gap-10">
              <div className="text-body-medium font-bold">
                <Trans>Failed to claim funds</Trans>
              </div>
              <div className="text-body-small text-gray-500">{event.data.error.message}</div>
            </div>
          );

          return;
        case TxnEventName.Sent:
          helperToast.success(
            <div className="flex flex-col gap-10">
              <div className="text-body-medium font-bold">
                <Trans>Funds claimed</Trans>
              </div>
              <Trans>
                Claimed{" "}
                {Object.entries(amounts)
                  .map(([token, amount]) => `${amount} ${token}`)
                  .join(", ")}{" "}
                successfully
              </Trans>
            </div>
          );

          return;
      }
    },
  });
}

const useExecutionFee = (
  account: string | undefined,
  claimableAmounts: Record<string, { amount?: bigint; usd?: bigint } | undefined>,
  chainId: number,
  claimTermsAcceptedSignature: string | undefined,
  signer: WalletSigner | undefined
) => {
  const enabled = Boolean(
    claimTermsAcceptedSignature && signer && account && Object.values(claimableAmounts).some((e) => e?.amount)
  );

  return useSWR(
    enabled ? [account, claimableAmounts, chainId, claimTermsAcceptedSignature, signer] : null,
    async () => {
      if (!claimTermsAcceptedSignature || !signer || !account) {
        return undefined;
      }

      const gasPrice = await getGasPrice(signer.provider!, chainId);

      const callData = getCallData(
        Object.keys(claimableAmounts),
        account,
        claimTermsAcceptedSignature,
        GLP_DISTRIBUTION_ID
      );
      const estimateGasParams = {
        to: getContract(chainId, "ClaimHandler"),
        data: callData,
        value: 0n,
        account,
      };
      const gasLimit = await signer.provider?.estimateGas(estimateGasParams);

      return gasLimit * ("gasPrice" in gasPrice ? gasPrice.gasPrice : gasPrice.maxFeePerGas);
    }
  );
};

export default function ClaimableAmounts() {
  const { account, signer } = useWallet();
  const chainId = useSelector(selectChainId);
  const { claimTerms, totalFundsToClaimUsd, claimableAmounts, fundsToClaimTitles, claimsDisabled } =
    useUserClaimableAmounts(chainId, account);
  const settings = useSettings();

  const [claimTermsAcceptedSignature, setClaimTermsAcceptedSignature] = useLocalStorage(
    `claimTermsAcceptedSignature:${account}:${GLP_DISTRIBUTION_ID}`,
    ""
  );

  const { data: executionFee } = useExecutionFee(
    account,
    claimableAmounts,
    chainId,
    claimTermsAcceptedSignature,
    signer
  );

  const signClaimTerms = useCallback(async () => {
    const message = `${claimTerms}\ndistributionId ${GLP_DISTRIBUTION_ID}\ncontract ${getContract(chainId, "ClaimHandler").toLowerCase()}\nchainId ${chainId}`;
    const signature = await signer?.signMessage(message);

    if (signature) {
      setClaimTermsAcceptedSignature(signature);
    }
  }, [setClaimTermsAcceptedSignature, signer, claimTerms, chainId]);

  const claimAmounts = useCallback(() => {
    if (!claimTermsAcceptedSignature || !signer || !account) {
      return;
    }

    createClaimAmountsTransaction({
      tokens: Object.keys(claimableAmounts),
      chainId,
      signer,
      account,
      signature: claimTermsAcceptedSignature,
      distributionId: GLP_DISTRIBUTION_ID,
      amounts: fundsToClaimTitles,
    });
  }, [claimTermsAcceptedSignature, signer, account, claimableAmounts, chainId, fundsToClaimTitles]);

  const { balancesData } = useTokenBalances(chainId);
  const userNativeTokenBalance = balancesData?.[NATIVE_TOKEN_ADDRESS];

  const controls = useMemo(() => {
    if (totalFundsToClaimUsd === 0n) {
      return (
        <Button variant="secondary" disabled>
          <Trans>No funds to claim</Trans>
        </Button>
      );
    }

    const requiredExecutionFee = estimateExecutionGasPrice({
      rawGasPrice: executionFee,
      maxPriorityFeePerGas: 0n,
      bufferBps: getExecutionFeeBufferBps(chainId, settings.executionFeeBufferBps),
      premium: 0n,
    });

    const hasAvailableFundsToCoverExecutionFee =
      userNativeTokenBalance !== undefined && userNativeTokenBalance >= requiredExecutionFee;

    let isClaimDisabled = false;

    if (claimTerms) {
      isClaimDisabled = !claimTermsAcceptedSignature || !hasAvailableFundsToCoverExecutionFee;
    } else {
      isClaimDisabled = !hasAvailableFundsToCoverExecutionFee;
    }

    if (claimsDisabled) {
      isClaimDisabled = true;
    }

    return (
      <>
        {!hasAvailableFundsToCoverExecutionFee ? (
          <AlertInfoCard type="warning">
            <Trans>Insufficient gas for network fees</Trans>
          </AlertInfoCard>
        ) : null}
        {claimTerms && hasAvailableFundsToCoverExecutionFee ? (
          <Checkbox
            isChecked={Boolean(claimTermsAcceptedSignature)}
            setIsChecked={signClaimTerms}
            disabled={Boolean(claimTermsAcceptedSignature)}
          >
            <span className="muted">
              <Trans>Accept Claim Terms</Trans>
            </span>
          </Checkbox>
        ) : null}
        <Button variant="primary" className="!py-10" disabled={isClaimDisabled} onClick={claimAmounts}>
          {claimsDisabled ? <Trans>Claims are disabled</Trans> : <Trans>Claim funds</Trans>}
        </Button>
      </>
    );
  }, [
    totalFundsToClaimUsd,
    claimTermsAcceptedSignature,
    signClaimTerms,
    claimTerms,
    claimAmounts,
    executionFee,
    userNativeTokenBalance,
    settings.executionFeeBufferBps,
    chainId,
    claimsDisabled,
  ]);

  return (
    <div className="flex flex-row gap-20 p-18">
      <div className="flex flex-row items-center justify-between gap-20">
        {Object.entries(claimableAmounts).map(([token, data]) => (
          <div key={token}>
            <div className="flex flex-col gap-5">
              <div className="text-sm text-nowrap text-slate-100">{data?.title}</div>
              <div className="flex flex-row gap-5">
                {data?.amount !== undefined ? (
                  <>
                    <span>{formatAmount(data?.amount ?? 0n, 18)}</span>
                    <span className="text-slate-100">({formatUsd(data?.usd ?? 0n)})</span>
                  </>
                ) : (
                  <Skeleton width={84} height={18} baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-grow flex-row items-center justify-end gap-20">{controls}</div>
    </div>
  );
}
