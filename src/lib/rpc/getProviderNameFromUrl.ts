export function getProviderNameFromUrl(rpcUrl: string) {
  try {
    const parsedUrl = new URL(rpcUrl);

    return parsedUrl.hostname;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Invalid rpc URL: ${rpcUrl}`);
  }

  return "unknown";
}
