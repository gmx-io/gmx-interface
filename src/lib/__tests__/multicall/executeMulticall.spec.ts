/* eslint-disable */
import "@testing-library/jest-dom";
import Token from "abis/Token.json";
import * as MulticallLib from "ethereum-multicall";
import { FALLBACK_PROVIDERS } from "config/chains";
import { generateTestingUtils } from "eth-testing";
import { BigNumber, ethers } from "ethers";

import { JsonRpcProvider } from "@ethersproject/providers";
import { MulticallRequestConfig, MulticallResult } from "lib/multicall";

const MulticallSpy = jest.spyOn(MulticallLib, "Multicall");

const testRequest: MulticallRequestConfig<any> = {
  testContract: {
    contractAddress: ethers.constants.AddressZero,
    abi: Token.abi,
    calls: { name: { methodName: "name", params: [] } },
  },
  testContract2: {
    contractAddress: ethers.constants.AddressZero,
    abi: Token.abi,
    calls: {
      name: { methodName: "name", params: [] },
      balance: { methodName: "balanceOf", params: [ethers.constants.AddressZero] },
    },
  },
};

const testResult: MulticallResult<any> = {
  testContract: {
    name: {
      returnValues: ["test"],
      success: true,
    },
  },
  testContract2: {
    name: {
      returnValues: ["test"],
      success: true,
    },
    balance: {
      returnValues: [BigNumber.from(0)],
      success: true,
    },
  },
};

// Returned from lib
const testMulticallResponse = {
  results: {
    testContract: {
      originalContractCallContext: {} as any,
      callsReturnContext: [
        {
          reference: "name",
          returnValues: ["test"],
          success: true,
        },
      ],
    },
    testContract2: {
      originalContractCallContext: {} as any,
      callsReturnContext: [
        {
          reference: "name",
          returnValues: ["test"],
          success: true,
        },
        {
          reference: "balance",
          returnValues: [{ type: "BigNumber", hex: "0x00" }],
          success: true,
        },
      ],
    },
  },
};

async function isFallbackProvider(provider: JsonRpcProvider) {
  await provider.ready;

  return FALLBACK_PROVIDERS[provider.network.chainId].includes(provider.connection.url);
}

jest.setTimeout(10000);

describe("executeMulticall", () => {
  const ethTesting = generateTestingUtils({ providerType: "MetaMask" });

  // beforeAll(() => {
  //   window.ethereum = ethTesting.getProvider();
  // });

  beforeEach(() => {
    // not log erros in tests
    jest.spyOn(console, "error").mockImplementation(() => null);
    jest.spyOn(console, "log").mockImplementation(() => null);
  });

  afterEach(() => {
    jest.clearAllMocks();
    ethTesting.clearAllMocks();
  });

  // it("should initialize Multicall with active wallet", async () => {
  //   let usedProvider;
  //   let libraryProvider;
  //   // @ts-ignore
  //   MulticallSpy.mockImplementation(({ ethersProvider }) => ({
  //     call: () => {
  //       usedProvider = ethersProvider;
  //       return Promise.resolve(testMulticallResponse);
  //     },
  //   }));

  //   ethTesting.mockConnectedWallet([ethers.Wallet.createRandom().address], { chainId: ARBITRUM });

  //   let result;

  //   testHook(() => {
  //     const { library, activate, deactivate } = useWeb3React();

  //     useEffect(() => {
  //       const connectInjectedWallet = getInjectedHandler(activate, deactivate);

  //       connectInjectedWallet();
  //     }, [activate, deactivate]);

  //     useEffect(() => {
  //       if (library) {
  //         libraryProvider = library.getSigner().provider;

  //         executeMulticall(chainId, library, testRequest).then((res) => {
  //           result = res;
  //         });
  //       }
  //     }, [library]);
  //   });

  //   // wait extra time to make sure the library is ready
  //   await act(() => sleep(500));

  //   expect(MulticallSpy).toBeCalled();
  //   expect(usedProvider).toEqual(libraryProvider);
  //   expect(result).toMatchObject(testResult);
  // });

  // it("should use requested chainId if chainId in the wallet is different", async () => {
  //   const walletChainId = AVALANCHE;
  //   const requestChainId = ARBITRUM;

  //   let usedChainId;
  //   let result;

  //   // @ts-ignore
  //   MulticallSpy.mockImplementation(({ ethersProvider }) => ({
  //     call: async () => {
  //       await ethersProvider.ready;

  //       usedChainId = ethersProvider.network.chainId;

  //       return testMulticallResponse;
  //     },
  //   }));

  //   ethTesting.mockConnectedWallet([ethers.Wallet.createRandom().address], { chainId: walletChainId });

  //   testHook(() => {
  //     const { library, activate, deactivate } = useWeb3React();

  //     useEffect(() => {
  //       const connectInjectedWallet = getInjectedHandler(activate, deactivate);

  //       connectInjectedWallet();
  //     }, [activate, deactivate]);

  //     useEffect(() => {
  //       if (library) {
  //         executeMulticall(requestChainId, library, testRequest).then((res) => {
  //           result = res;
  //         });
  //       }
  //     }, [library]);
  //   });

  //   // wait extra time to make sure the library is ready
  //   await act(() => sleep(500));

  //   expect(MulticallSpy).toBeCalled();
  //   expect(result).toMatchObject(testResult);
  //   expect(usedChainId).toEqual(requestChainId);
  // });

  // it("should initialize with inactive wallet", async () => {
  //   MulticallSpy.mockReturnValue({
  //     call: () => Promise.resolve(testMulticallResponse),
  //   } as any);

  //   const result = await executeMulticall(chainId, undefined, testRequest);

  //   expect(MulticallSpy).toBeCalled();
  //   expect(result).toMatchObject(testResult);
  // });

  // it("should use fallback on timeout", async () => {
  //   // @ts-ignore
  //   MulticallSpy.mockImplementation(({ ethersProvider }) => ({
  //     call: async () => {
  //       if (await isFallbackProvider(ethersProvider)) {
  //         return testMulticallResponse;
  //       } else {
  //         await sleep(MAX_TIMEOUT + 1);

  //         return "fallback is not used";
  //       }
  //     },
  //   }));

  //   const result = await executeMulticall(chainId, undefined, testRequest);
  //   expect(MulticallSpy).toBeCalledTimes(2);
  //   expect(result).toMatchObject(testResult);
  // });

  // it("should use fallback on error", async () => {
  //   // @ts-ignore
  //   MulticallSpy.mockImplementation(({ ethersProvider }) => ({
  //     call: async () => {
  //       if (await isFallbackProvider(ethersProvider)) {
  //         return testMulticallResponse;
  //       } else {
  //         return Promise.reject("test error");
  //       }
  //     },
  //   }));

  //   const result = await executeMulticall(chainId, undefined, testRequest);

  //   expect(MulticallSpy).toBeCalledTimes(2);
  //   expect(result).toMatchObject(testResult);
  // });

  // it("should throw an error if fallback provider doesn't specified", async () => {
  //   const getFallbackProviderSpy = jest.spyOn(rpcLib, "getFallbackProvider").mockReturnValue(undefined);

  //   // @ts-ignore
  //   MulticallSpy.mockImplementation(({ ethersProvider }) => ({
  //     call: async () => {
  //       if (await isFallbackProvider(ethersProvider)) {
  //         return testMulticallResponse;
  //       } else {
  //         return Promise.reject("test error");
  //       }
  //     },
  //   }));

  //   getFallbackProviderSpy.mockReturnValue(undefined);

  //   await expect(executeMulticall(chainId, undefined, testRequest)).rejects.toEqual("test error");

  //   expect(getFallbackProviderSpy).toBeCalled();
  //   expect(MulticallSpy).toBeCalledTimes(1);

  //   getFallbackProviderSpy.mockRestore();
  // });

  it("should throw the error if fallback throws an error", async () => {
    // @ts-ignore
    MulticallSpy.mockImplementation(() => ({
      call: async () => {
        return Promise.reject("test error");
      },
    }));

    // await expect(executeMulticall(chainId, undefined, testRequest)).rejects.toEqual("test error");
    // expect(MulticallSpy).toBeCalledTimes(2);
  });
});
