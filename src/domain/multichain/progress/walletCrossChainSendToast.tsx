import { Trans } from "@lingui/macro";
import { ReactNode } from "react";
import { toast } from "react-toastify";

import { AnyChainId, getChainName, isTestnetChain } from "config/chains";
import { TokenData } from "domain/tokens";
import { CHAIN_ID_TO_TX_URL_BUILDER } from "lib/chains/blockExplorers";
import { shortenAddressOrEns } from "lib/wallets";
import { formatTokenAmount } from "sdk/utils/numbers";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { StatusNotification } from "components/StatusNotification/StatusNotification";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { TransactionStatus, TransactionStatusType } from "components/TransactionStatus/TransactionStatus";

import { LzStatus, watchLzTx } from "./watchLzTx";

type LzPhase = "pending" | "confirmed" | "failed";

type WalletCrossChainSendStatusToastParams = {
  sourceChainId: AnyChainId;
  destinationChainId: AnyChainId;
  token: TokenData;
  amount: bigint;
  txHash: string;
};

const TERMINAL_AUTO_CLOSE_MS = 7000;

export function showWalletCrossChainSendStatusToast({
  sourceChainId,
  destinationChainId,
  token,
  amount,
  txHash,
}: WalletCrossChainSendStatusToastParams) {
  const toastId = `wallet-cross-chain-send:${txHash}`;
  const isTestnet = isTestnetChain(sourceChainId);

  const render = (status: LzStatus | undefined): ReactNode => (
    <WalletCrossChainSendToastContent
      sourceChainId={sourceChainId}
      destinationChainId={destinationChainId}
      token={token}
      amount={amount}
      txHash={txHash}
      isTestnet={isTestnet}
      status={status}
    />
  );

  toast(render(undefined), {
    toastId,
    type: "success",
    autoClose: false,
  });

  let lastStatus: LzStatus | undefined;

  const update = (status: LzStatus | undefined, autoClose: number | false) => {
    if (!toast.isActive(toastId)) {
      return;
    }

    const failed = status !== undefined && (status.source === "failed" || status.destination === "failed");

    toast.update(toastId, {
      render: render(status),
      type: failed ? "error" : "success",
      autoClose,
    });
  };

  watchLzTx({
    chainId: sourceChainId,
    txHash,
    withLzCompose: false,
    onUpdate: (data) => {
      const status = data[0];
      if (status === undefined) {
        return;
      }

      lastStatus = status;
      const failed = status.source === "failed" || status.destination === "failed";
      const completed = status.source === "confirmed" && status.destination === "confirmed";
      update(status, failed || completed ? TERMINAL_AUTO_CLOSE_MS : false);
    },
  })
    .catch(() => undefined)
    .finally(() => update(lastStatus, TERMINAL_AUTO_CLOSE_MS));
}

function getSourceTransactionStatus(phase: LzPhase): TransactionStatusType {
  if (phase === "confirmed") {
    return "success";
  }

  if (phase === "failed") {
    return "error";
  }

  return "loading";
}

function getDestinationTransactionStatus(sourcePhase: LzPhase, destinationPhase: LzPhase): TransactionStatusType {
  if (sourcePhase !== "confirmed") {
    return "muted";
  }

  if (destinationPhase === "confirmed") {
    return "success";
  }

  if (destinationPhase === "failed") {
    return "error";
  }

  return "loading";
}

function WalletCrossChainSendToastContent({
  sourceChainId,
  destinationChainId,
  token,
  amount,
  txHash,
  isTestnet,
  status,
}: WalletCrossChainSendStatusToastParams & { isTestnet: boolean; status: LzStatus | undefined }) {
  const sourcePhase: LzPhase = status?.source ?? "pending";
  const destinationPhase: LzPhase = status?.destination ?? "pending";

  const scanUrl = isTestnet
    ? CHAIN_ID_TO_TX_URL_BUILDER["layerzero-testnet"](txHash)
    : CHAIN_ID_TO_TX_URL_BUILDER["layerzero"](txHash);

  return (
    <StatusNotification
      title={
        <div className="flex items-center gap-4">
          <TokenIcon symbol={token.symbol} displaySize={16} className="size-16" />
          <Trans>
            Sending {formatTokenAmount(amount, token.decimals, token.symbol)} to {getChainName(destinationChainId)}
          </Trans>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        <TransactionStatus
          status={getSourceTransactionStatus(sourcePhase)}
          text={<Trans>Sent on {getChainName(sourceChainId)}</Trans>}
        />
        <TransactionStatus
          status={getDestinationTransactionStatus(sourcePhase, destinationPhase)}
          text={<Trans>Received on {getChainName(destinationChainId)}</Trans>}
        />
        <SyntheticsInfoRow
          label={<Trans>Transaction</Trans>}
          valueClassName="flex items-center"
          value={
            <ExternalLink href={scanUrl} variant="icon">
              {shortenAddressOrEns(txHash, 13)}
            </ExternalLink>
          }
        />
      </div>
    </StatusNotification>
  );
}
