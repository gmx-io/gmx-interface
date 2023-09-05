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
  lengths?: { [key: string]: number; };
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
  const trader = ensName || address;
  const strLength = (breakpoint && lengths && lengths[breakpoint]) || maxLength;

  return (
    <Link className="trader-account-label" to={ `/actions/v2/${address}` }>
      {
        avatarUrl ? (
          <span
            className="trader-account-avatar"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              backgroundImage: `url(${avatarUrl})`,
            }}
          />
        ) : (
          <Jazzicon diameter={ size } seed={ jsNumberForAddress(address) }/>
        )
      }
      <span className="trader-address">
        { strLength ? shortenAddress(trader, strLength) : trader }
      </span>
    </Link>
  );
}
