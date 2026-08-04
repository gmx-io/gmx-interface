import { Trans } from "@lingui/macro";
import { useAddFunds } from "@privy-io/react-auth";
import { ReactNode, useState } from "react";
import { useAccount } from "wagmi";

import { ARBITRUM, getChainName } from "config/chains";
import {
  CHAIN_ID_PREFERRED_DEPOSIT_TOKEN,
  getAccountModalMode,
  getMappedTokenId,
  isSettlementChain,
  isSourceChainForAnySettlementChain,
} from "config/multichain";
import { useGmxAccountModalOpen, useGmxAccountWalletReceiveViewChain } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { metrics } from "lib/metrics";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import CardIcon from "img/ic_card.svg?react";
import ChainIcon from "img/ic_chain.svg?react";
import ReceiveIcon from "img/ic_receive.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";

type FundingOption = "card" | "crypto";

function isUserExitedFundingError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const { code, message } = error as { code?: unknown; message?: unknown };

  if (code === "USER_EXITED") {
    return true;
  }

  return typeof message === "string" && /exited|cancel/i.test(message);
}

function FundingOptionRow({
  icon,
  title,
  description,
  onClick,
  isPending,
  disabled,
}: {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  onClick: () => void;
  isPending?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className="flex w-full items-center justify-between gap-12 rounded-12 border-1/2 border-stroke-primary bg-slate-950/50 p-12 text-left -outline-offset-4 disabled:cursor-default disabled:opacity-70 gmx-hover:bg-fill-surfaceElevated50"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex items-center gap-12">
        <div className="flex size-36 shrink-0 items-center justify-center rounded-8 bg-fill-surfaceElevated50 text-blue-400 dark:text-blue-300">
          {icon}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-body-medium font-medium text-typography-primary">{title}</span>
          <span className="text-body-small text-typography-secondary">{description}</span>
        </div>
      </div>
      {isPending ? (
        <SpinnerIcon className="size-16 shrink-0 animate-spin text-typography-secondary" />
      ) : (
        <ArrowRightIcon className="size-16 shrink-0 text-typography-secondary" />
      )}
    </button>
  );
}

export function WalletReceiveOptionsView() {
  const { address } = useAccount();
  const { chainId: settlementChainId, srcChainId } = useChainId();
  const [walletReceiveViewChain] = useGmxAccountWalletReceiveViewChain();
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  const chainId = walletReceiveViewChain ?? srcChainId ?? settlementChainId;
  const chainName = getChainName(chainId);
  const mode = getAccountModalMode(settlementChainId, srcChainId);

  const { addFunds } = useAddFunds();

  const [pendingOption, setPendingOption] = useState<FundingOption | undefined>(undefined);
  const [unavailableOption, setUnavailableOption] = useState<FundingOption | undefined>(undefined);

  const usdcTokenId =
    isSettlementChain(chainId) || isSourceChainForAnySettlementChain(chainId)
      ? getMappedTokenId(ARBITRUM, CHAIN_ID_PREFERRED_DEPOSIT_TOKEN[ARBITRUM], chainId)
      : undefined;

  if (!address) {
    return null;
  }

  const destination = usdcTokenId
    ? { address, chain: `eip155:${chainId}` as const, asset: usdcTokenId.address }
    : undefined;

  const handleReceiveToWallet = () => {
    setIsVisibleOrView("walletReceive");
  };

  const handleAddFunds = async (option: FundingOption) => {
    if (pendingOption !== undefined) {
      return;
    }

    if (!destination) {
      setUnavailableOption(option);
      return;
    }

    setPendingOption(option);
    setUnavailableOption(undefined);

    try {
      await addFunds(option === "card" ? { destination, fiat: {} } : { destination, crypto: {} });
    } catch (error) {
      if (!isUserExitedFundingError(error)) {
        metrics.pushError(error, `walletReceiveOptions.${option === "card" ? "fiatOnramp" : "depositAddress"}`);
        setUnavailableOption(option);
      }
    } finally {
      setPendingOption(undefined);
    }
  };

  return (
    <div className="flex grow flex-col gap-12 p-adaptive">
      <div className="text-body-medium text-typography-secondary">
        <Trans>How would you like to add funds?</Trans>
      </div>

      <div className="flex flex-col gap-8">
        <FundingOptionRow
          icon={<ReceiveIcon className="size-20" />}
          title={<Trans>Receive to this wallet</Trans>}
          description={<Trans>Copy your wallet address or scan a QR code.</Trans>}
          onClick={handleReceiveToWallet}
          disabled={pendingOption !== undefined}
        />

        <FundingOptionRow
          icon={<CardIcon className="size-20" />}
          title={<Trans>Buy with card</Trans>}
          description={<Trans>Use debit/credit card, Apple Pay, or Google Pay where supported.</Trans>}
          onClick={() => handleAddFunds("card")}
          isPending={pendingOption === "card"}
          disabled={pendingOption !== undefined}
        />
        {unavailableOption === "card" && (
          <ColorfulBanner color="yellow">
            <Trans>
              Buying with card is currently unavailable for your region or configuration. Use{" "}
              <span className="font-medium">Receive to this wallet</span> instead.
            </Trans>
          </ColorfulBanner>
        )}

        <FundingOptionRow
          icon={<ChainIcon className="size-20" />}
          title={<Trans>Transfer from another chain</Trans>}
          description={<Trans>Deposit from another wallet, exchange, or chain.</Trans>}
          onClick={() => handleAddFunds("crypto")}
          isPending={pendingOption === "crypto"}
          disabled={pendingOption !== undefined}
        />
        {unavailableOption === "crypto" && (
          <ColorfulBanner color="yellow">
            <Trans>
              Transfers from another chain are currently unavailable. Use{" "}
              <span className="font-medium">Receive to this wallet</span> instead.
            </Trans>
          </ColorfulBanner>
        )}
      </div>

      <ColorfulBanner color="blue">
        {mode === "walletOnly" ? (
          <Trans>Funds arrive in your connected wallet on {chainName}.</Trans>
        ) : (
          <Trans>
            Funds arrive in your connected wallet on {chainName}, not in your GMX Account. To trade with your GMX
            Account, deposit the funds to it as a separate step once they arrive.
          </Trans>
        )}
      </ColorfulBanner>
    </div>
  );
}
