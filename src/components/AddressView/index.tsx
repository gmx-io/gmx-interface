import React, { useState, useEffect } from "react";
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon'
import { Link } from "react-router-dom";
import { createBreakpoint } from "react-use";
import { AvatarResolver, utils } from '@ensdomains/ens-avatar';
import { useStaticMainnetProvider } from "domain/synthetics/leaderboards";
import { shortenAddress } from "lib/legacy";
import "./index.css"

type AddressViewProps = {
  address: string;
  size: number;
};

export default function AddressView({ address, size = 24 }: AddressViewProps) {
  const useBreakpoint = createBreakpoint({ L: 600, M: 550, S: 400 });
  const breakpoint = useBreakpoint();
  const provider = useStaticMainnetProvider();
  const [url, setUrl] = useState<string>();
  const [ensName, setEnsName] = useState<string>();

  useEffect(() => {
    if (!provider || !address) {
      return;
    }

    void (async () => {
      try {
        const name = await provider.lookupAddress(address.toLowerCase());
        if (!name) {
          return;
        }
        setEnsName(name);

        // @ts-ignore
        const resolver = new AvatarResolver(provider);
        const metadata = await resolver.getMetadata(name);
        const url = metadata && utils.getImageURI({ metadata });
        if (url) {
          setUrl(url);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Ens/Avatar error:", e);
      }
    })();
  }, [provider, address]);

  return (
    <Link className="trader-account-label" to={ `/actions/v2/${address}` } target="_blank">
      {
        url ? (
          <span
            className="trader-account-avatar"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              backgroundImage: `url(${url})`,
            }}
          />
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
