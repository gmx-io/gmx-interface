import React, { useState } from "react";
import { ethers } from "ethers";
import { useWeb3React } from "@web3-react/core";

import ERC721 from "abis/ERC721.json";

import "./NftWallet.css";
import { t, Trans } from "@lingui/macro";
import { callContract } from "lib/contracts";
import { useChainId } from "lib/chains";

export default function NftWallet() {
  const [nftAddress, setNftAddress] = useState("");
  const [nftId, setNftId] = useState("");
  const [receiver, setReceiver] = useState("");
  const [isSubmitting, setIsSubmitting] = useState("");

  const { active, account, library } = useWeb3React();
  const { chainId } = useChainId();

  function getTransferError() {
    if (!active) {
      return t`Wallet not connected`;
    }
    if (!receiver || receiver.length === 0) {
      return t`Enter Receiver Address`;
    }
    if (!ethers.utils.isAddress(receiver)) {
      return t`Invalid Receiver Address`;
    }
    if (!nftAddress || nftAddress.length === 0) {
      return t`Enter NFT Address`;
    }
    if (!ethers.utils.isAddress(nftAddress)) {
      return t`Invalid NFT Address`;
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
      return t`Tranferring...`;
    }
    return t`Transfer NFT`;
  }

  function isPrimaryEnabled() {
    return !getTransferError();
  }

  function transferNft() {
    setIsSubmitting(true);
    const contract = new ethers.Contract(nftAddress, ERC721.abi, library.getSigner());
    callContract(chainId, contract, "transferFrom", [account, receiver, nftId], {
      sentMsg: t`Transfer submitted!`,
      failMsg: t`Transfer failed.`,
    }).finally(() => {
      setIsSubmitting(false);
    });
  }

  return (
    <div className="NftWallet Page page-layout">
      <div className="Page-title-section">
        <div className="Page-title">
          <Trans>NFT Wallet</Trans>
        </div>
      </div>
      <div className="NftWallet-content">
        <div className="NftWallet-row">
          <label>
            <Trans>Receiver Address</Trans>
          </label>
          <div>
            <input type="text" value={receiver} onChange={(e) => setReceiver(e.target.value)} />
          </div>
        </div>
        <div className="NftWallet-row">
          <label>
            <Trans>NFT Address</Trans>
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
          <button className="App-cta Exchange-swap-button" disabled={!isPrimaryEnabled()} onClick={() => transferNft()}>
            {getPrimaryText()}
          </button>
        </div>
      </div>
    </div>
  );
}
