import React, { useState, useEffect } from "react";
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon'
import { Link } from "react-router-dom";
import { createBreakpoint } from "react-use";
import { AvatarResolver, utils } from '@ensdomains/ens-avatar';
import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { shortenAddress, useENS } from "lib/legacy";
import { getProvider } from "lib/rpc";
import { useChainId } from "lib/chains";

import "./index.css"

type AddressViewProps = {
  address: string;
  size: number;
};

export default function AddressView({ address, size = 24 }: AddressViewProps) {
  const { chainId } = useChainId();
  const { ensName } = useENS(address);
  const useBreakpoint = createBreakpoint({ L: 600, M: 550, S: 400 });
  const breakpoint = useBreakpoint();
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!ensName) {
      return;
    }

    void (async () => {
      const provider = getProvider(undefined, chainId);
      // @ts-ignore
      const avatar = new AvatarResolver(provider as StaticJsonRpcProvider);
      const metadata = await avatar.getMetadata(ensName);
      const url = metadata && utils.getImageURI({ metadata });
      if (url) {
        setUrl(url);
      }
    })();
  }, [ensName, chainId]);

  return (
    <Link className="trader-account-label" to={ `/actions/v2/${address}` } target="_blank">
      {
        url ? (
          <img src={ url } height={ size } width="auto" alt={ ensName }/>
        ) : (
          <Jazzicon diameter={ size } seed={ jsNumberForAddress(address) }/>
        )
      }
      <span className="trader-address">
        { shortenAddress(ensName || address, breakpoint === "S" ? 20 :42) }
      </span>
    </Link>
  );
}
