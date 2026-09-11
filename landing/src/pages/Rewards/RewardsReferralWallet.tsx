import { t, Trans } from "@lingui/macro";
import { useConnectOrCreateWallet, useConnectWallet, useModalStatus, usePrivy } from "@privy-io/react-auth";
import { useRef, useState } from "react";
import { ToastContainer } from "react-toastify";
import { useAccount, useSwitchChain } from "wagmi";

import { ARBITRUM } from "config/chains";
import { useAffiliateCodes } from "domain/referrals/hooks";
import { useCreateReferralCode } from "domain/referrals/hooks/useCreateReferralCode";
import { getCodeError } from "domain/referrals/utils/referralsHelper";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { shareOrCopyElementAsImage } from "lib/copyElementAsImage";
import { MAX_REFERRAL_CODE_LENGTH } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";
import WalletProvider from "lib/wallets/WalletProvider";

import CopyIcon from "img/ic_copy.svg?react";
import XIcon from "img/social/ic_x_new.svg?react";

import { ReferralCardFrame, RewardsReferralCard } from "./RewardsReferralCard";

import "react-toastify/dist/ReactToastify.css";

type Props = { config: IncentivesConfig | null | undefined };

export default function RewardsReferralWallet(props: Props) {
  return (
    <WalletProvider>
      <ReferralWallet {...props} />
      <ToastContainer position="bottom-right" theme="dark" />
    </WalletProvider>
  );
}

function ReferralWallet({ config }: Props) {
  const [connectionError, setConnectionError] = useState<string>();
  const { address, isConnected } = useAccount();
  const { ready, authenticated } = usePrivy();
  const { isOpen } = useModalStatus();
  const onError = () => setConnectionError(t`Unable to connect your wallet. Please try again.`);
  const { connectWallet } = useConnectWallet({ onError });
  const { connectOrCreateWallet } = useConnectOrCreateWallet({ onError });

  if (isConnected && address) return <ConnectedReferral key={address} account={address} config={config} />;

  return (
    <ReferralCardFrame config={config}>
      <button
        className="rewards-button"
        disabled={!ready || isOpen}
        onClick={() => {
          setConnectionError(undefined);
          if (authenticated) connectWallet();
          else connectOrCreateWallet();
        }}
      >
        {!ready ? <Trans>Loading wallet...</Trans> : <Trans>Connect wallet</Trans>}
      </button>
      {connectionError && <p role="alert">{connectionError}</p>}
    </ReferralCardFrame>
  );
}

function ConnectedReferral({ account, config }: Props & { account: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const codes = useAffiliateCodes(ARBITRUM, account, true, refreshKey);
  const [createdCode, setCreatedCode] = useState<string>();
  const [isCreating, setIsCreating] = useState(false);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<string>();
  const [isSharing, setIsSharing] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const { chainId, signer } = useWallet();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const creation = useCreateReferralCode({ chainId: ARBITRUM, account, signer, onSuccess: setCreatedCode });
  const code = createdCode ?? codes.code ?? undefined;
  const url = code ? `${window.location.origin}/rewards?ref=${encodeURIComponent(code)}` : undefined;
  const codeError = getCodeError(input);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url!);
      setFeedback(t`Link copied`);
    } catch (_error) {
      setFeedback(t`Unable to copy. Copy the link below.`);
    }
  }

  async function copyImage() {
    if (!imageRef.current || isSharing) return;
    setIsSharing(true);
    try {
      await shareOrCopyElementAsImage({
        element: imageRef.current,
        isMobile: window.matchMedia("(max-width: 767px)").matches,
        fileName: "gmx-rewards.png",
        extraOptions: { style: { transform: "none" } },
      });
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <ReferralCardFrame config={config} preview={<RewardsReferralCard code={code} url={url} ref={imageRef} />}>
      {code && url ? (
        <>
          <div className="rewards-share-buttons">
            <a
              className="rewards-button"
              href={`https://x.com/intent/post?text=${encodeURIComponent(t`Your trading fees come back to you. Check your GMX rewards.`)}&url=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t`Share on X`}
            >
              <Trans>Share on</Trans>
              <XIcon aria-hidden="true" />
            </a>
            <button
              className="rewards-button rewards-button-muted"
              onClick={() => void copyImage()}
              disabled={isSharing}
            >
              {isSharing ? <Trans>Preparing...</Trans> : <Trans>Copy image</Trans>}
              <CopyIcon aria-hidden="true" />
            </button>
            <button className="rewards-button rewards-button-muted" onClick={() => void copyLink()}>
              <Trans>Copy link</Trans>
              <CopyIcon aria-hidden="true" />
            </button>
          </div>
          {feedback && (
            <div className="rewards-share-feedback" role="status">
              <p>{feedback}</p>
              <a href={url}>{url}</a>
            </div>
          )}
        </>
      ) : codes.error ? (
        <div className="rewards-referral-error">
          <p role="alert">
            <Trans>Unable to load your referral codes.</Trans>
          </p>
          <button className="rewards-button" onClick={() => setRefreshKey((key) => key + 1)}>
            <Trans>Try again</Trans>
          </button>
        </div>
      ) : !codes.success ? (
        <p role="status">
          <Trans>Loading your referral codes...</Trans>
        </p>
      ) : chainId !== ARBITRUM ? (
        <>
          <button
            className="rewards-button"
            disabled={isSwitching}
            onClick={() => {
              setFeedback(undefined);
              void switchChainAsync({ chainId: ARBITRUM }).catch(() =>
                setFeedback(t`Unable to switch networks. Please try again.`)
              );
            }}
          >
            <Trans>Switch to Arbitrum to create a code</Trans>
          </button>
          {feedback && <p role="alert">{feedback}</p>}
        </>
      ) : isCreating ? (
        <form
          className="rewards-create-code"
          onSubmit={(event) => {
            event.preventDefault();
            void creation.createCode(input);
          }}
        >
          <label htmlFor="rewards-referral-code">
            <Trans>Your referral code</Trans>
          </label>
          <input
            id="rewards-referral-code"
            value={input}
            placeholder={t`Enter referral code`}
            autoComplete="off"
            spellCheck={false}
            maxLength={MAX_REFERRAL_CODE_LENGTH}
            disabled={creation.isSubmitting}
            onChange={(event) => setInput(event.target.value)}
          />
          {(codeError || creation.error) && <p role="alert">{codeError || creation.error}</p>}
          <button
            className="rewards-button"
            disabled={!input.trim() || Boolean(codeError) || creation.isSubmitting || !signer}
          >
            {creation.isSubmitting ? <Trans>Creating code...</Trans> : <Trans>Create code and invite traders</Trans>}
          </button>
        </form>
      ) : (
        <button className="rewards-button" onClick={() => setIsCreating(true)}>
          <Trans>Create code and invite traders</Trans>
        </button>
      )}
    </ReferralCardFrame>
  );
}
