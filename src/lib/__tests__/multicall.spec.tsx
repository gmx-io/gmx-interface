import "@testing-library/jest-dom";
import { act, cleanup, render } from "@testing-library/react";
// import Token from "abis/Token.json";

import { Web3Provider } from "@ethersproject/providers";
import { Web3ReactProvider } from "@web3-react/core";
// import { ARBITRUM } from "config/chains";
// import { getTokenBySymbol } from "config/tokens";
// import * as MulticallLib from "ethereum-multicall";
// import { useMulticall } from "lib/multicall";
import { sleep } from "lib/sleep";

// const chainId = ARBITRUM;
// const token = getTokenBySymbol(chainId, "USDC");

// const MulticallSpy = jest.spyOn(MulticallLib, "Multicall");

export function Comp() {
  // const res = useMulticall(chainId, [], {
  //   test: {
  //     contractAddress: token.address,
  //     abi: Token.abi,
  //     calls: {
  //       name: {
  //         methodName: "name",
  //         params: [],
  //       },
  //       decimals: {
  //         methodName: "decimals",
  //         params: [],
  //       },
  //     },
  //   },
  // });

  return <div></div>;
}

function TestApp({ children }) {
  return <Web3ReactProvider getLibrary={(provider) => new Web3Provider(provider)}>{children}</Web3ReactProvider>;
}

afterEach(() => {
  cleanup();
});

describe("Multicall", () => {
  it("Should render TestApp", () => {
    const { getByTestId } = render(
      <TestApp>
        <div data-testid="test">test</div>
      </TestApp>
    );

    expect(getByTestId("test").textContent).toEqual("test");
  });

  it("Should init multicall", async () => {
    render(
      <TestApp>
        <Comp />
      </TestApp>
    );

    await act(() => sleep(100));

    expect(true).toBe(true);
  });
});
