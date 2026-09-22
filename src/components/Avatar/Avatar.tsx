import { Image } from "@davatar/react";
import { PublicKey } from "@solana/web3.js";
import { useEnsAvatar } from "wagmi";

import { SOURCE_ETHEREUM_MAINNET } from "config/chains";

export type Props = {
  size: number;
  address: string;
  ensName?: string;
};

function jazziconAddress(address: string) {
  if (address.startsWith("0x")) return address;

  try {
    const hex = [...new PublicKey(address).toBytes().slice(0, 4)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return `0x${hex}`;
  } catch {
    return address;
  }
}

export function Avatar({ size, address, ensName }: Props) {
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName,
    chainId: SOURCE_ETHEREUM_MAINNET,
  });

  return <Image size={size} address={jazziconAddress(address)} uri={ensAvatar} />;
}
