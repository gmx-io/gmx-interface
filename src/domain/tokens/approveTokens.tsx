import { Trans, t } from "@lingui/macro";
import { Signer, ethers } from "ethers";
import { Link } from "react-router-dom";

import { getChainName, getExplorerUrl } from "config/chains";
import { AddTokenPermitFn } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { helperToast } from "lib/helperToast";
import Token from "sdk/abis/Token.json";
import { getNativeToken, getToken } from "sdk/configs/tokens";
import { InfoTokens, TokenInfo } from "sdk/types/tokens";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

type Params = {
  setIsApproving: (val: boolean) => void;
  signer: Signer | undefined;
  tokenAddress: string;
  spender: string;
  chainId: number;
  permitParams:
    | {
        addTokenPermit: AddTokenPermitFn;
      }
    | undefined;
  onApproveSubmitted?: () => void;
  onApproveFail?: (error: Error) => void;
  getTokenInfo?: (infoTokens: InfoTokens, tokenAddress: string) => TokenInfo;
  infoTokens?: InfoTokens;
  pendingTxns?: any[];
  setPendingTxns?: (txns: any[]) => void;
  includeMessage?: boolean;
  approveAmount: bigint | undefined;
};

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
}: Params) {
  setIsApproving(true);

  if (approveAmount === undefined) {
    approveAmount = ethers.MaxUint256;
  }

  if (permitParams?.addTokenPermit && getToken(chainId, tokenAddress).isPermitSupported) {
    return await permitParams
      .addTokenPermit(tokenAddress, spender, approveAmount)
      .then(() => {
        helperToast.success(
          <div>
            <Trans>Permit signed!</Trans>
            <br />
          </div>
        );

        onApproveSubmitted?.();
        setIsApproving(false);
      })
      .catch((e) => {
        helperToast.error(
          <div>
            <Trans>Permit signing failed</Trans>
            <br />
            <ToastifyDebug error={String(e)} />
          </div>
        );
      });
  }

  const contract = new ethers.Contract(tokenAddress, Token.abi, signer);
  const nativeToken = getNativeToken(chainId);
  const networkName = getChainName(chainId);
  contract
    .approve(spender, approveAmount ?? ethers.MaxUint256)
    .then(async (res) => {
      const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash;
      helperToast.success(
        <div>
          <Trans>
            Approval submitted! <ExternalLink href={txUrl}>View status.</ExternalLink>
          </Trans>
          <br />
        </div>
      );
      if (onApproveSubmitted) {
        onApproveSubmitted();
      }
      if (getTokenInfo && infoTokens && pendingTxns && setPendingTxns) {
        const token = getTokenInfo(infoTokens, tokenAddress);
        const pendingTxn = {
          hash: res.hash,
          message: includeMessage ? t`${token.symbol} Approved!` : false,
        };
        setPendingTxns([...pendingTxns, pendingTxn]);
      }
    })
    .catch((e) => {
      onApproveFail?.(e);
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
              There is not enough {nativeToken.symbol} in your account on {networkName} to send this transaction.
              <br />
              <br />
              <Link to="/buy_gmx#bridge">
                Buy or Transfer {nativeToken.symbol} to {networkName}
              </Link>
            </Trans>
          </div>
        );
      } else if (e.message?.includes("User denied transaction signature")) {
        failMsg = t`Approval was cancelled`;
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
    })
    .finally(() => {
      setIsApproving(false);
    });
}
