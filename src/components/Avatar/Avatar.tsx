import { Image } from "@davatar/react";
import { ETH_MAINNET } from "config/chains";
import { useEnsAvatar } from "wagmi";

export type Props = {
  size: number;
  address: string;
  ensName?: string;
};

export function Avatar({ size, address, ensName }: Props) {
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName,
    chainId: ETH_MAINNET,
  });

  return <Image size={size} address={address} uri={ensAvatar} />;
}
