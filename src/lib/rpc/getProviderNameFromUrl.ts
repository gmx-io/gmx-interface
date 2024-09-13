export function getProviderNameFromUrl(rpcUrl: string) {
  let rpcName = "unknown";

  try {
    const parsedUrl = new URL(rpcUrl);
    const hostnameParts = parsedUrl.hostname.split(".");
    const rpcDomain = hostnameParts.at(-2);

    if (rpcDomain) {
      rpcName = rpcDomain;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Invalid rpc URL: ${rpcUrl}`);
  }

  return rpcName;
}
