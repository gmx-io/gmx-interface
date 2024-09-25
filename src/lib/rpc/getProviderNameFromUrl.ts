export function getProviderNameFromUrl(rpcUrl: string) {
  try {
    const parsedUrl = new URL(rpcUrl);
    const hostnameParts = parsedUrl.hostname.split(".");

    if (hostnameParts.length > 2) {
      return hostnameParts.slice(-2).join(".");
    }

    return parsedUrl.hostname;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Invalid rpc URL: ${rpcUrl}`);
  }

  return "unknown";
}
