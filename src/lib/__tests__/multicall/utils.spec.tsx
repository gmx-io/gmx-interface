import "@testing-library/jest-dom";
import Token from "abis/Token.json";
import * as MulticallLib from "ethereum-multicall";
import { getTokenBySymbol } from "config/tokens";
import { ARBITRUM } from "config/chains";
import { executeMulticall } from "lib/multicall/utils";
import { generateTestingUtils } from "eth-testing";
// import { Web3ReactProvider } from "@web3-react/core";
// import { Web3Provider } from "@ethersproject/providers";
import { sleep } from "lib/sleep";
import * as rpcLib from "lib/rpc";
import { ethers } from "ethers";

const chainId = ARBITRUM;

const MulticallSpy = jest.spyOn(MulticallLib, "Multicall");
const getFallbackProviderSpy = jest.spyOn(rpcLib, "getFallbackProvider");
const fallbackProvider = new ethers.providers.StaticJsonRpcProvider("fallback");

const testRequest = [
  {
    reference: "usdc",
    contractAddress: getTokenBySymbol(chainId, "USDC").address,
    abi: Token.abi,
    calls: [{ reference: "name", methodName: "name", methodParameters: [] }],
  },
];

// function TestApp({ children }) {
//   return <Web3ReactProvider getLibrary={(provider) => new Web3Provider(provider)}>{children}</Web3ReactProvider>;
// }

jest.setTimeout(10000);

describe("executeMulticall", () => {
  const testingUtils = generateTestingUtils({ providerType: "MetaMask" });

  beforeAll(() => {
    window.ethereum = testingUtils.getProvider();
  });

  afterEach(() => {
    testingUtils.clearAllMocks();
  });

  beforeEach(() => {
    // not log erros in tests
    jest.spyOn(console, "error").mockImplementation(() => null);
    jest.clearAllMocks();
  });

  // TODO:
  // it("should initialize Multicall with active library", async () => {
  //   function Comp() {
  //     const { library, active, account, activate } = useWeb3React();

  //     useEffect(() => {
  //       activate(getInjectedConnector());
  //     }, [activate]);

  //     useEffect(() => {
  //       if (library) {
  //         executeMulticall(chainId, library, testRequest);
  //       }
  //     }, [library]);

  //     console.log(library, account, active);

  //     return null;
  //   }

  //   testingUtils.mockConnectedWallet(["0xf61B443A155b07D2b2cAeA2d99715dC84E839EEf"]);

  //   await act(() => sleep(100));

  //   render(
  //     <TestApp>
  //       <Comp />
  //     </TestApp>
  //   );

  //   await act(() => sleep(100));

  //   expect(MulticallSpy).toBeCalled();
  // });

  it("should initialize with inactive account", async () => {
    MulticallSpy.mockReturnValue({
      call: () => Promise.resolve("test"),
    } as any);

    const result = await executeMulticall(chainId, undefined, testRequest);

    expect(MulticallSpy).toBeCalledTimes(1);
    expect(result).toEqual("test");
  });

  it("should use fallback on timeout", async () => {
    // @ts-ignore
    MulticallSpy.mockImplementation(({ ethersProvider }) => ({
      call: () => sleep(ethersProvider === fallbackProvider ? 0 : 2001).then(() => "test"),
    }));

    getFallbackProviderSpy.mockReturnValue(fallbackProvider);

    const result = await executeMulticall(chainId, undefined, testRequest);

    expect(MulticallSpy).toBeCalledTimes(2);
    expect(MulticallSpy).toHaveBeenCalledWith({ ethersProvider: fallbackProvider, tryAggregate: true });
    expect(result).toEqual("test");
  });

  it("should use fallback on error", async () => {
    // @ts-ignore
    MulticallSpy.mockImplementation(({ ethersProvider }) => ({
      call: () => (ethersProvider === fallbackProvider ? Promise.resolve("test") : Promise.reject("test error")),
    }));

    getFallbackProviderSpy.mockReturnValue(fallbackProvider);

    const result = await executeMulticall(chainId, undefined, testRequest);

    expect(MulticallSpy).toBeCalledTimes(2);
    expect(MulticallSpy).toHaveBeenCalledWith({ ethersProvider: fallbackProvider, tryAggregate: true });
    expect(result).toEqual("test");
  });

  it("should throw an error if fallback provider doesn't specified", async () => {
    // @ts-ignore
    MulticallSpy.mockImplementation(({ ethersProvider }) => ({
      call: () => (ethersProvider === fallbackProvider ? Promise.resolve("test") : Promise.reject("test error")),
    }));

    getFallbackProviderSpy.mockReturnValue(undefined);

    await expect(executeMulticall(chainId, undefined, testRequest)).rejects.toEqual("test error");

    expect(getFallbackProviderSpy).toBeCalled();
    expect(MulticallSpy).toBeCalledTimes(1);
  });

  it("should throw the error if fallback throws an error", async () => {
    // @ts-ignore
    MulticallSpy.mockImplementation(() => ({
      call: () => Promise.reject("test error"),
    }));

    getFallbackProviderSpy.mockReturnValue(fallbackProvider);

    await expect(executeMulticall(chainId, undefined, testRequest)).rejects.toEqual("test error");

    expect(MulticallSpy).toHaveBeenCalledWith({ ethersProvider: fallbackProvider, tryAggregate: true });
    expect(MulticallSpy).toBeCalledTimes(2);
  });
});
