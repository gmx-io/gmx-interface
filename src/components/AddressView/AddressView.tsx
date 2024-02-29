import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { Link } from "react-router-dom";
import { shortenAddress } from "lib/legacy";
import "./AddressView.scss";
import { useMemo } from "react";

type AddressViewProps = {
  address: string;
  size: number;
  ensName?: string;
  avatarUrl?: string;
  breakpoint?: string;
  maxLength?: number;
};

const lengths = { S: 9, M: 13, L: 13, XL: 13 };

export default function AddressView({
  address,
  ensName,
  avatarUrl,
  size = 24,
  breakpoint,
  maxLength,
}: AddressViewProps) {
  const strLength = (breakpoint && lengths[breakpoint]) ?? maxLength;
  let trader;

  if (strLength) {
    trader = (ensName ? "" : "0x") + shortenAddress(ensName || address.replace(/^0x/, ""), strLength, 0);
  } else {
    trader = ensName || address;
  }

  const style = useMemo(
    () => ({
      width: `${size}px`,
      height: `${size}px`,
      backgroundImage: `url(${avatarUrl})`,
    }),
    [avatarUrl, size]
  );

  return (
    <Link className="AddressView" to={`/actions/v2/${address}`}>
      {avatarUrl ? (
        <span className="AddressView-ens-avatar" style={style} />
      ) : (
        <Jazzicon diameter={size} seed={jsNumberForAddress(address)} />
      )}
      <span className="AddressView-trader-id">{trader}</span>
    </Link>
  );
}
