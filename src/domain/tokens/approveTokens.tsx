import { Trans, t } from "@lingui/macro";
import { Signer, ethers } from "ethers";
import { Link } from "react-router-dom";
import { maxUint256 } from "viem";

import { getChainName, getExplorerUrl } from "config/chains";
import { JUMPER_BRIDGE_URL } from "config/links";
import { AddTokenPermitFn } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { INVALID_PERMIT_SIGNATURE_ERROR } from "lib/errors/customErrors";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { sendTokenPermitMetric } from "lib/metrics/tokenPermitMetrics";
import { getProvider } from "lib/rpc";
import TokenAbi from "sdk/abis/Token";
import { getNativeToken } from "sdk/configs/tokens";
import { InfoTokens, TokenInfo } from "sdk/utils/tokens/types";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

type Params = {
  setIsApproving: (val: boolean) => void;
  signer: Signer | undefined;
  tokenAddress: string;
  spender: string;
  chainId: number;
  /** Set only when a permit can stand in for the approval of this token */
  permitParams:
    | {
        addTokenPermit: AddTokenPermitFn;
        disableTokenPermits: (tokenAddresses: string[]) => void;
        accountType: string | undefined;
      }
    | undefined;
  onApproveSubmitted?: ({ isPermit }: { isPermit: boolean }) => void;
  onApproveFail?: (error: Error, { isPermit }: { isPermit: boolean }) => void;
  getTokenInfo?: (infoTokens: InfoTokens, tokenAddress: string) => TokenInfo;
  infoTokens?: InfoTokens;
  pendingTxns?: any[];
  setPendingTxns?: (txns: any[]) => void;
  includeMessage?: boolean;
  approveAmount: bigint | undefined;
};

type PermitFallbackReason = "failed" | "invalidSignature";

export type ApproveTokensResult = {
  hash: `0x${string}`;
};

export function getApproveSubmittedToastContent({ txUrl }: { txUrl: string }) {
  return (
    <div>
      <Trans>
        Approval submitted
        <br />
        <br />
        <ExternalLink href={txUrl}>View</ExternalLink>
      </Trans>
    </div>
  );
}

export async function approveTokens({
  setIsApproving,
  signer,
  tokenAddress,
  spender,
  chainId,
  onApproveSubmitted,
  onApproveFail,
  getTokenInfo,
  infoTokens,
  pendingTxns,
  setPendingTxns,
  includeMessage,
  approveAmount,
  permitParams,
}: Params): Promise<ApproveTokensResult | undefined> {
  setIsApproving(true);

  if (approveAmount === undefined) {
    approveAmount = maxUint256;
  }

  let permitFallbackReason: PermitFallbackReason | undefined;

  if (permitParams) {
    const permitMetricParams = { chainId, tokenAddress, accountType: permitParams.accountType };

    try {
      await permitParams.addTokenPermit(tokenAddress, spender, approveAmount);
      sendTokenPermitMetric({ ...permitMetricParams, outcome: "signed" });
      onApproveSubmitted?.({ isPermit: true });
      helperToast.success(
        <div>
          <Trans>Permit signed</Trans>
          <br />
        </div>
      );
      setIsApproving(false);
      return;
    } catch (e) {
      const error = e as Error;
      const lowerMessage = error.message?.toLowerCase();
      const isUserRejection = lowerMessage?.includes("user rejected") || lowerMessage?.includes("user denied");

      if (isUserRejection) {
        sendTokenPermitMetric({ ...permitMetricParams, outcome: "rejected" });
        onApproveFail?.(error, { isPermit: true });
        helperToast.error(t`Permit signing cancelled`);
        setIsApproving(false);
        return;
      }

      permitFallbackReason = error.message?.includes(INVALID_PERMIT_SIGNATURE_ERROR) ? "invalidSignature" : "failed";
      permitParams.disableTokenPermits([tokenAddress]);
      metrics.pushError(error, "approveTokens.permitError");
      sendTokenPermitMetric({ ...permitMetricParams, outcome: "fallback", reason: permitFallbackReason });
    }
  }

  if (permitFallbackReason) {
    helperToast.info(getPermitFallbackToastContent(permitFallbackReason));
  }

  const contract = new ethers.Contract(tokenAddress, TokenAbi, signer);
  const nativeToken = getNativeToken(chainId);
  const networkName = getChainName(chainId);

  const finalApproveAmount = approveAmount ?? maxUint256;

  try {
    const gasLimit = await estimateGasLimit(getProvider(undefined, chainId), {
      to: tokenAddress,
      data: contract.interface.encodeFunctionData("approve", [spender, finalApproveAmount]),
      from: await signer!.getAddress(),
      value: undefined,
    });

    const res = await contract.approve(spender, finalApproveAmount, { chainId, gasLimit });

    const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash;
    helperToast.success(getApproveSubmittedToastContent({ txUrl }));

    if (onApproveSubmitted) {
      onApproveSubmitted({ isPermit: false });
    }
    if (getTokenInfo && infoTokens && pendingTxns && setPendingTxns) {
      const token = getTokenInfo(infoTokens, tokenAddress);
      const pendingTxn = {
        hash: res.hash,
        message: includeMessage ? t`${token.symbol} approved` : false,
      };
      setPendingTxns([...pendingTxns, pendingTxn]);
    }

    return { hash: res.hash as `0x${string}` };
  } catch (e) {
    onApproveFail?.(e, { isPermit: false });
    // eslint-disable-next-line no-console
    console.error(e);
    let failMsg;
    if (
      ["not enough funds for gas", "failed to execute call with revert code InsufficientGasFunds"].includes(
        e.data?.message
      )
    ) {
      failMsg = (
        <div>
          <Trans>
            Insufficient {nativeToken.symbol} for gas on {networkName}
            <br />
            <br />
            <Link className="underline" to={`/trade/swap?to=${nativeToken.symbol}`}>
              Swap
            </Link>{" "}
            or <ExternalLink href={JUMPER_BRIDGE_URL}>bridge</ExternalLink> {nativeToken.symbol} to {networkName}
          </Trans>
        </div>
      );
    } else if (e.message?.includes("User denied transaction signature")) {
      failMsg = t`Approval cancelled`;
    } else {
      failMsg = (
        <>
          <Trans>Approval failed</Trans>
          <br />
          <br />
          <ToastifyDebug error={String(e)} />
        </>
      );
    }
    helperToast.error(failMsg);
  } finally {
    setIsApproving(false);
  }
}

function getPermitFallbackToastContent(reason: PermitFallbackReason) {
  let reasonText: string;

  switch (reason) {
    case "invalidSignature":
      reasonText = t`The permit signature could not be validated.`;
      break;
    case "failed":
      reasonText = t`Permit approval could not be completed.`;
      break;
  }

  return (
    <div>
      {reasonText}
      <br />
      <br />
      <Trans>A standard approval transaction is required to continue.</Trans>
    </div>
  );
}
