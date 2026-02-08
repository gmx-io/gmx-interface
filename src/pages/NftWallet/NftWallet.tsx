import { t, Trans } from "@lingui/macro";
import { ethers } from "ethers";
import { useState } from "react";
import { isAddress } from "viem";

import { useChainId } from "lib/chains";
import { callContract } from "lib/contracts";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";

import "./NftWallet.css";

export default function NftWallet() {
  const [nftAddress, setNftAddress] = useState("");
  const [nftId, setNftId] = useState("");
  const [receiver, setReceiver] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { active, account, signer } = useWallet();
  const { chainId } = useChainId();

  function getTransferError() {
    if (!active) {
      return t`Wallet not connected`;
    }
    if (!receiver || receiver.length === 0) {
      return t`Enter receiver address`;
    }
    if (!isAddress(receiver, { strict: false })) {
      return t`Invalid receiver address`;
    }
    if (!nftAddress || nftAddress.length === 0) {
      return t`Enter NFT address`;
    }
    if (!isAddress(nftAddress, { strict: false })) {
      return t`Invalid NFT address`;
    }
    if (!nftId || nftId.toString().length === 0) {
      return t`Enter NFT ID`;
    }
  }

  function getPrimaryText() {
    const transferError = getTransferError();
    if (transferError) {
      return transferError;
    }
    if (isSubmitting) {
      return t`Transferring...`;
    }
    return t`Transfer NFT`;
  }

  function isPrimaryEnabled() {
    return !getTransferError();
  }

  function transferNft() {
    setIsSubmitting(true);
    const contract = new ethers.Contract(nftAddress, abis.ERC721, signer);
    callContract(chainId, contract, "transferFrom", [account, receiver, nftId], {
      sentMsg: t`Transfer submitted`,
      failMsg: t`Transfer failed`,
    }).finally(() => {
      setIsSubmitting(false);
    });
  }

  return (
    <AppPageLayout>
      <div className="NftWallet Page page-layout">
        <div className="Page-title-section">
          <div className="Page-title">
            <Trans>NFT wallet</Trans>
          </div>
        </div>
        <div className="NftWallet-content">
          <div className="NftWallet-row">
            <label>
              <Trans>Receiver address</Trans>
            </label>
            <div>
              <input type="text" value={receiver} onChange={(e) => setReceiver(e.target.value)} />
            </div>
          </div>
          <div className="NftWallet-row">
            <label>
              <Trans>NFT address</Trans>
            </label>
            <div>
              <input type="text" value={nftAddress} onChange={(e) => setNftAddress(e.target.value)} />
            </div>
          </div>
          <div className="NftWallet-row">
            <label>
              <Trans>NFT ID</Trans>
            </label>
            <div>
              <input type="number" value={nftId} onChange={(e) => setNftId(e.target.value)} />
            </div>
          </div>
          <div className="NftWallet-row">
            <button
              className="App-cta Exchange-swap-button"
              disabled={!isPrimaryEnabled()}
              onClick={() => transferNft()}
            >
              {getPrimaryText()}
            </button>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}
