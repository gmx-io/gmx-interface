import { Image } from "@davatar/react";
import { useEnsAvatar } from "wagmi";

import { SOURCE_ETHEREUM_MAINNET } from "config/chains";

export type Props = {
  size: number;
  address: string;
  ensName?: string;
};

// @davatar/react reads address.slice(2, 10) as hex. A Solana address is base58, so fold it into a stable 20-byte hex seed.
function toJazziconAddress(address: string): string {
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return address;
  }

  const bytes = new Uint8Array(20);
  for (let i = 0; i < address.length; i++) {
    bytes[i % 20] ^= address.charCodeAt(i);
  }

  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }

  return `0x${hex}`;
}

export function Avatar({ size, address, ensName }: Props) {
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName,
    chainId: SOURCE_ETHEREUM_MAINNET,
  });

  return <Image size={size} address={toJazziconAddress(address)} uri={ensAvatar} />;
}
