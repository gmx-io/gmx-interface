import React from "react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { Link } from "react-router-dom";
import { shortenAddress } from "lib/legacy";
import "./AddressView.css";

type AddressViewProps = {
  address: string;
  size: number;
  ensName?: string;
  avatarUrl?: string;
  breakpoint?: string;
  lengths?: { [key: string]: number };
  maxLength?: number;
};

export default function AddressView({
  address,
  ensName,
  avatarUrl,
  size = 24,
  breakpoint,
  lengths,
  maxLength,
}: AddressViewProps) {
  const strLength = (breakpoint && lengths && lengths[breakpoint]) || maxLength;
  let trader;
  if (strLength) {
    trader = (ensName ? "" : "0x") + shortenAddress(ensName || address.replace(/^0x/, ""), strLength, 0);
  } else {
    trader = ensName || address;
  }

  return (
    <Link className="AddressView" to={`/actions/v2/${address}`}>
      {avatarUrl ? (
        <span
          className="AddressView-ens-avatar"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundImage: `url(${avatarUrl})`,
          }}
        />
      ) : (
        <Jazzicon diameter={size} seed={jsNumberForAddress(address)} />
      )}
      <span className="AddressView-trader-id">{trader}</span>
    </Link>
  );
}
