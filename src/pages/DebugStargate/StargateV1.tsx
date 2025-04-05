import {
  Chain,
  EndpointVersion,
  Stage,
  chainAndStageToEndpointId,
  endpointIdToChainKey,
} from "@layerzerolabs/lz-definitions";
import { ASSETS, TokenName } from "@stargatefinance/stg-definitions-v2";
import { BrowserProvider, Contract, JsonRpcProvider, ZeroAddress, parseEther } from "ethers";
import noop from "lodash/noop";
import { useState } from "react";
import useSWR from "swr";
import { useAccount } from "wagmi";

import { ARBITRUM_SEPOLIA, AVALANCHE_FUJI, RPC_PROVIDERS } from "config/chains";
import { approveTokens } from "domain/tokens";
import { formatBalanceAmount, parseValue } from "lib/numbers";
import { abis } from "sdk/abis";
import { getTokenBySymbol } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";

import IStargateRouter from "./IStargateRouter.json";

const stargateRouter = new Contract("0x2a4C2F5ffB0E0F2dcB3f9EBBd442B8F77ECDB9Cc", IStargateRouter.abi);

const USDC_SG = getTokenBySymbol(ARBITRUM_SEPOLIA, "USDC.SG");

const usdcSgArbitrumSepoliaContract = new Contract("0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773", abis.ERC20);
const usdcSgAvalancheFujiContract = new Contract("0x89C1D24fFb34020a9Be5463bD2578fF966E9f303", abis.ERC20);

const usdcSgConfig = ASSETS[TokenName.USDC];

const sourceId = chainAndStageToEndpointId(Chain.ARBSEP, Stage.TESTNET, EndpointVersion.V1);
const destinationId = chainAndStageToEndpointId(Chain.AVALANCHE, Stage.TESTNET, EndpointVersion.V1);

// To sign use BrowserProvider
const arbitrumSepoliaProvider = new BrowserProvider(window.ethereum, ARBITRUM_SEPOLIA);
// To read use JsonRpcProvider
const avalancheFujiProvider = new JsonRpcProvider(RPC_PROVIDERS[AVALANCHE_FUJI][0], AVALANCHE_FUJI);

export function StargateV1() {
  const { address, chainId } = useAccount();
  const [inputValue, setInputValue] = useState<string>("");

  const amount = parseValue(inputValue, USDC_SG.decimals);

  const handleSwap = async () => {
    if (!chainId || !address || amount === undefined || amount <= 0n) return;

    const connectedRouter = stargateRouter.connect(await arbitrumSepoliaProvider.getSigner()) as Contract;

    // allowance from me to router
    const allowance: bigint = await usdcSgArbitrumSepoliaContract
      .connect(arbitrumSepoliaProvider)
      .allowance(address, await connectedRouter.getAddress());

    const needsApproval = allowance < amount;

    console.log("needsApproval", needsApproval);

    if (needsApproval) {
      const { resolve, promise } = Promise.withResolvers<void>();
      approveTokens({
        chainId,
        signer: await arbitrumSepoliaProvider.getSigner(),
        tokenAddress: await usdcSgArbitrumSepoliaContract.getAddress(),
        spender: await connectedRouter.getAddress(),
        setIsApproving: noop,
        onApproveSubmitted: () => {
          console.log("onApproveSubmitted");
          resolve();
        },
        onApproveFail: () => {
          console.log("onApproveFail");
          resolve();
        },
      });

      await promise;

      await new Promise((resolve) => setTimeout(resolve, 4000));
    }

    const messageFee = parseEther("0.07"); // send 0.02 eth converter to wei
    try {
      const tx = await connectedRouter.swap(
        destinationId,
        usdcSgConfig.assetId,
        usdcSgConfig.assetId,
        address,
        amount,
        0,
        {
          dstGasForCall: 0,
          dstNativeAmount: 0,
          dstNativeAddr: ZeroAddress,
        },
        address,
        "0x",
        { value: messageFee }
      );
      console.log("tx", tx);
    } catch (error) {
      console.error(error);
    }
  };

  const balanceUsdcSgArbitrumSepolia = useSWR(address ? ["balance", address, ARBITRUM_SEPOLIA] : null, {
    fetcher: async () => {
      const balance = await usdcSgArbitrumSepoliaContract.connect(arbitrumSepoliaProvider).balanceOf(address);
      return balance;
    },
    refreshInterval: 5000,
  });

  const balanceUsdcSgAvalancheFuji = useSWR(address ? ["balance", address, AVALANCHE_FUJI] : null, {
    fetcher: async () => {
      try {
        const balance = await usdcSgAvalancheFujiContract.connect(avalancheFujiProvider).balanceOf(address);
        return balance;
      } catch (error) {
        return 0n;
      }
    },
    refreshInterval: 5000,
  });

  return (
    <div className="flex min-w-[400px] flex-col gap-8 rounded-4 bg-slate-800 p-16">
      <h1 className="text-h1 leading-base">Debug Stargate V1</h1>
      <p>Wallet chain must be {endpointIdToChainKey(sourceId).toString()}</p>
      <SyntheticsInfoRow label="Source Chain endpoint id" value={sourceId} />
      <SyntheticsInfoRow label="Destination Chain endpoint id" value={destinationId} />
      <SyntheticsInfoRow label="Source Chain key" value={endpointIdToChainKey(sourceId).toString()} />
      <SyntheticsInfoRow label="Destination Chain key" value={endpointIdToChainKey(destinationId).toString()} />
      <SyntheticsInfoRow label="Source Chain config" value={usdcSgConfig.networks[sourceId] ? "True" : "False"} />
      <SyntheticsInfoRow
        label="Destination Chain config"
        value={usdcSgConfig.networks[destinationId] ? "True" : "False"}
      />

      <SyntheticsInfoRow
        label="Balance Arbitrum Sepolia USDC.SG"
        value={formatBalanceAmount(balanceUsdcSgArbitrumSepolia.data, USDC_SG.decimals)}
      />
      <SyntheticsInfoRow
        label="Balance Avalanche Fuji USDC.SG"
        value={formatBalanceAmount(balanceUsdcSgAvalancheFuji.data, USDC_SG.decimals)}
      />
      <NumberInput value={inputValue} onValueChange={(e) => setInputValue(e.target.value)} placeholder="0.0" />
      <Button type="button" variant="primary" onClick={handleSwap}>
        Swap
      </Button>
    </div>
  );
}
