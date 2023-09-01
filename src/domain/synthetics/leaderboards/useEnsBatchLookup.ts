import useSWR from "swr";
import { AvatarResolver, utils } from '@ensdomains/ens-avatar';
import { useBatchProvider } from "domain/synthetics/leaderboards";

export function useEnsBatchLookup(addresses: string[]) {
  const provider = useBatchProvider();
  const newAddresses = [...addresses].sort();

  const addressesKey = provider && newAddresses.length ? [provider, newAddresses.join("-")] : null;
  const ensNames = useSWR<Record<string, string> | undefined>(addressesKey, async (provider, addressesKey) => {
    if (!provider || !addressesKey) {
      return;
    }

    const addresses = addressesKey.split("-");
    const namePromises: Array<Promise<{ address: string; error: any; name: string | null; }>> = [];
    for (const address of addresses) {
      namePromises.push(
        provider
          .lookupAddress(address)
          .then(name => ({ address, error: null, name }))
          .catch(error => ({ address, error, name: null }))
      );
    };

    const names = await Promise.all(namePromises);

    const namesByAddress = {};
    const addressesByName = {}
    for (const { address, name } of names) {
      if (name) {
        namesByAddress[address] = name;
        addressesByName[name] = address;
      }
    }

    return namesByAddress;
  });

  const resolvedNames = Object.entries(ensNames.data || {})
    .sort(([a, nameA], [b, nameB]) => nameA < nameB ? -1 : 1);

  const avatarUrls = useSWR<Record<string, string> | undefined>(
    provider && resolvedNames.length ? [
      "ens/avatars",
      provider,
      resolvedNames.map(([, name]) => name),
      resolvedNames.map(([address]) => address),
    ] : null,
    async (_, provider, names, addresses) => {
      // console.log({_, provider, names, addresses});
      if (!provider || !names || !names.length) {
        return;
      }

      const urlPromises: Array<Promise<{ address: string, error: any, url: string | null }>> = [];

      for (let i = 0; i < names.length; i++) {
        // const name = names[i];
        // const address = addresses[i];
        // urlPromises.push(
        //   provider
        //     .getResolver(name)
        //     .then(resolver => (
        //       resolver
        //         ? resolver.getText("avatar").then(url => ({ address, error: null, url }))
        //         : ({ address, error: null, url: null })
        //     ))
        //     .catch((error) => ({ address, error, url: null }))
        // );
      }

      const urls = await Promise.all(urlPromises);
      // console.log('urls', urls);

      const urlsByAddress = {};
      for (const { address, url } of urls) {
        if (url) {
          urlsByAddress[address] = utils.getImageURI({ metadata: { image: url } });
        }
      }

      return urlsByAddress;
    }
  );

  // console.log(avatarUrls);

  return {
    ensNames: ensNames.data || {},
    avatarUrls: avatarUrls.data || {},
  };
}

export function useEnsRecord({ address }) {
  const provider = useBatchProvider();
  const ensName = useSWR(["ens/name", address, provider], () => {
    if (!provider || !address) {
      return;
    }

    return provider.lookupAddress(address.toLowerCase());
  });

  const avatarUrl = useSWR(["ens/avatar", ensName.data, provider], async () => {
    if (!provider || !ensName.data) {
      return;
    }

    // @ts-ignore
    const resolver = new AvatarResolver(provider);
    const metadata = await resolver.getMetadata(ensName.data);

    return metadata && utils.getImageURI({ metadata });
  });

  return { ensName: ensName.data, avatarUrl: avatarUrl.data };
}
