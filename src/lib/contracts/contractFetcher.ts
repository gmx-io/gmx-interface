import { Provider, Signer, ethers } from "ethers";
import { getFallbackProvider, getProvider } from "../rpc";

export const contractFetcher =
  <T>(signer: Provider | Signer | undefined, contractInfo: any, additionalArgs?: any[]) =>
  (args: any): Promise<T> => {
    // eslint-disable-next-line
    const [id, chainId, arg0, arg1, ...params] = args;
    const provider = isProvider(signer) ? signer : getProvider(signer, chainId);

    const method = ethers.isAddress(arg0) ? arg1 : arg0;

    const contractCall = getContractCall({
      provider,
      contractInfo,
      arg0,
      arg1,
      method,
      params,
      additionalArgs,
    });

    let shouldCallFallback = true;

    const handleFallback = async (resolve, reject, error) => {
      if (!shouldCallFallback) {
        return;
      }
      // prevent fallback from being called twice
      shouldCallFallback = false;

      const fallbackProvider = getFallbackProvider(chainId);

      if (!fallbackProvider) {
        reject(error);
        return;
      }

      // eslint-disable-next-line no-console
      console.info("using fallbackProvider for", method);
      const fallbackContractCall = getContractCall({
        provider: fallbackProvider,
        contractInfo,
        arg0,
        arg1,
        method,
        params,
        additionalArgs,
      });

      fallbackContractCall
        ?.then((result) => resolve(result))
        .catch((e) => {
          // eslint-disable-next-line no-console
          console.error("fallback fetcher error", id, contractInfo.contractName, method, e);
          reject(e);
        });
    };

    return new Promise(async (resolve, reject) => {
      contractCall
        ?.then((result) => {
          shouldCallFallback = false;
          resolve(result);
        })
        .catch((e) => {
          // eslint-disable-next-line no-console
          console.error("fetcher error", id, contractInfo.contractName, method, e);
          handleFallback(resolve, reject, e);
        });

      setTimeout(() => {
        handleFallback(resolve, reject, "contractCall timeout");
      }, 2000);
    });
  };

function getContractCall({
  provider,
  contractInfo,
  arg0,
  arg1,
  method,
  params,
  additionalArgs,
}): Promise<any> | undefined {
  if (ethers.isAddress(arg0)) {
    const address = arg0;
    const contract = new ethers.Contract(address, contractInfo.abi, provider);

    if (additionalArgs) {
      return contract[method](...params.concat(additionalArgs));
    }
    return contract[method](...params);
  }

  if (!provider) {
    return;
  }

  return provider[method](arg1, ...params);
}

function isProvider(signerOrProvider: Provider | Signer | undefined): signerOrProvider is Provider {
  if (!signerOrProvider) return false;
  return !!(signerOrProvider as Signer).populateCall;
}
