import React, { useState } from "react";
import { ethers } from "ethers";
import { useWeb3React } from "@web3-react/core";
import { useChainId } from "../../lib/legacy";

import ERC721 from "../../abis/ERC721.json";

import { callContract } from "../../domain/legacy";
import "./NftWallet.css";

export default function NftWallet() {
  const [nftAddress, setNftAddress] = useState("");
  const [nftId, setNftId] = useState("");
  const [receiver, setReceiver] = useState("");
  const [isSubmitting, setIsSubmitting] = useState("");

  const { active, account, library } = useWeb3React();
  const { chainId } = useChainId();

  function getTransferError() {
    if (!active) {
      return "Wallet not connected";
    }
    if (!receiver || receiver.length === 0) {
      return "Enter Receiver Address";
    }
    if (!ethers.utils.isAddress(receiver)) {
      return "Invalid Receiver Address";
    }
    if (!nftAddress || nftAddress.length === 0) {
      return "Enter NFT Address";
    }
    if (!ethers.utils.isAddress(nftAddress)) {
      return "Invalid NFT Address";
    }
    if (!nftId || nftId.toString().length === 0) {
      return "Enter NFT ID";
    }
  }

  function getPrimaryText() {
    const transferError = getTransferError();
    if (transferError) {
      return transferError;
    }
    if (isSubmitting) {
      return "Tranferring...";
    }
    return "Transfer NFT";
  }

  function isPrimaryEnabled() {
    return !getTransferError();
  }

  function transferNft() {
    setIsSubmitting(true);
    const contract = new ethers.Contract(nftAddress, ERC721.abi, library.getSigner());
    callContract(chainId, contract, "transferFrom", [account, receiver, nftId], {
      sentMsg: "Transfer submitted!",
      failMsg: "Transfer failed.",
    }).finally(() => {
      setIsSubmitting(false);
    });
  }

  return (
    <div className="NftWallet Page page-layout">
      <div className="Page-title-section">
        <div className="Page-title">NFT Wallet</div>
      </div>
      <div className="NftWallet-content">
        <div className="NftWallet-row">
          <label>Receiver Address</label>
          <div>
            <input type="text" value={receiver} onChange={(e) => setReceiver(e.target.value)} />
          </div>
        </div>
        <div className="NftWallet-row">
          <label>NFT Address</label>
          <div>
            <input type="text" value={nftAddress} onChange={(e) => setNftAddress(e.target.value)} />
          </div>
        </div>
        <div className="NftWallet-row">
          <label>NFT ID</label>
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
