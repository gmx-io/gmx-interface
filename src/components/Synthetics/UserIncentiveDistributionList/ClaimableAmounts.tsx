import { Trans } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";
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
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import { getGasPrice } from "lib/gas/gasPrice";
import { helperToast } from "lib/helperToast";
import { formatAmount, formatUsd } from "lib/numbers";
import { sendWalletTransaction, TxnEventName } from "lib/transactions";
import { WalletSigner } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import ClaimHandlerAbi from "sdk/abis/ClaimHandler.json";
import { getToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

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
  claimableTokenTitles: Record<string, string>;
}) {
  const { tokens, chainId, signer, account, signature, distributionId, claimableTokenTitles } = data;
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
              <div className="flex flex-row gap-10 text-gray-200">
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
              <div className="text-body-small text-white">{event.data.error.message}</div>
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
                {tokens.map((token) => `${claimableTokenTitles[token]} ${getToken(chainId, token).symbol}`).join(", ")}{" "}
                successfully
              </Trans>
            </div>
          );

          return;
      }
    },
  });
}

const useClaimExecutionFee = (
  account: string | undefined,
  claimableTokens: string[],
  chainId: number,
  claimTermsAcceptedSignature: string | undefined,
  signer: WalletSigner | undefined
) => {
  const enabled = Boolean(claimTermsAcceptedSignature && signer && account && claimableTokens.length > 0);

  return useSWR(enabled ? [account, claimableTokens, chainId, claimTermsAcceptedSignature, signer] : null, {
    refreshInterval: 0,
    fetcher: async () => {
      const gasPrice = await getGasPrice(signer!.provider!, chainId);

      const callData = getCallData(claimableTokens, account!, claimTermsAcceptedSignature!, GLP_DISTRIBUTION_ID);
      const gasLimit = await estimateGasLimit(signer!.provider!, {
        to: getContract(chainId, "ClaimHandler"),
        data: callData,
        from: account!,
        value: undefined,
      });

      return gasLimit * ("gasPrice" in gasPrice ? gasPrice.gasPrice : gasPrice.maxFeePerGas);
    },
  });
};

export default function ClaimableAmounts() {
  const { account, signer } = useWallet();
  const chainId = useSelector(selectChainId);
  const {
    claimTerms,
    totalFundsToClaimUsd,
    claimableAmounts,
    claimableTokenTitles,
    claimsDisabled,
    claimableAmountsLoaded,
  } = useUserClaimableAmounts(chainId, account);
  const settings = useSettings();
  const [isClaiming, setIsClaiming] = useState(false);

  const [claimTermsAcceptedSignature, setClaimTermsAcceptedSignature] = useLocalStorage(
    `claimTermsAcceptedSignature:${account}:${GLP_DISTRIBUTION_ID}:${claimTerms}`,
    ""
  );

  const claimableTokens = useMemo(() => {
    return Object.keys(claimableAmounts).filter(
      (token) => claimableAmounts[token]?.amount !== undefined && claimableAmounts[token]!.amount > 0n
    );
  }, [claimableAmounts]);

  const { data: executionFee } = useClaimExecutionFee(
    account,
    claimableTokens,
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

  const claimAmounts = useCallback(async () => {
    if (!claimTermsAcceptedSignature || !signer || !account) {
      return;
    }

    setIsClaiming(true);
    try {
      await createClaimAmountsTransaction({
        tokens: claimableTokens,
        chainId,
        signer,
        account,
        signature: claimTermsAcceptedSignature,
        distributionId: GLP_DISTRIBUTION_ID,
        claimableTokenTitles,
      });
      setClaimTermsAcceptedSignature("");
    } finally {
      setIsClaiming(false);
    }
  }, [
    claimTermsAcceptedSignature,
    signer,
    account,
    claimableTokens,
    chainId,
    claimableTokenTitles,
    setClaimTermsAcceptedSignature,
  ]);

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

    if (claimsDisabled || isClaiming) {
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
          {claimsDisabled ? (
            <Trans>Claims are disabled</Trans>
          ) : isClaiming ? (
            <Trans>Claiming...</Trans>
          ) : (
            <Trans>Claim funds</Trans>
          )}
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
    isClaiming,
  ]);

  return (
    <div className="flex flex-row gap-20 p-18">
      <div className="flex flex-row items-center justify-between gap-20">
        {claimableAmountsLoaded ? (
          Object.entries(claimableAmounts)
            .filter(([, data]) => data?.amount !== undefined && data?.amount !== 0n)
            .map(([token, data]) => (
              <div key={token}>
                <div className="flex flex-col gap-5">
                  <div className="text-sm text-nowrap text-slate-100">{claimableTokenTitles[token]}</div>
                  <div className="flex flex-row gap-5">
                    <span>{formatAmount(data?.amount ?? 0n, 18)}</span>
                    <span className="text-slate-100">({formatUsd(data?.usd ?? 0n)})</span>
                  </div>
                </div>
              </div>
            ))
        ) : (
          <Skeleton width={300} height={32} baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" />
        )}
      </div>
      <div className="flex flex-grow flex-row items-center justify-end gap-20">{controls}</div>
    </div>
  );
}
