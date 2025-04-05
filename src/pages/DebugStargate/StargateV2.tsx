import {
  Chain,
  EndpointVersion,
  Stage,
  chainAndStageToEndpointId,
  endpointIdToChainKey,
} from "@layerzerolabs/lz-definitions";
import { Options, addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
import { ASSETS, TokenName } from "@stargatefinance/stg-definitions-v2";
import { errors as StargateV2ErrorsAbi } from "@stargatefinance/stg-evm-sdk-v2";
import StargatePoolUSDCArbitrumSepolia from "@stargatefinance/stg-evm-sdk-v2/deployments/arbsep-testnet/StargatePoolUSDC.json";
import TokenMessagingArbitrumSepolia from "@stargatefinance/stg-evm-sdk-v2/deployments/arbsep-testnet/TokenMessaging.json";
import {
  BrowserProvider,
  BytesLike,
  Contract,
  EventLog,
  JsonRpcProvider,
  MaxUint256,
  ZeroAddress,
  formatEther,
  formatUnits,
  hexlify,
  parseUnits,
  solidityPacked,
  toUtf8Bytes,
} from "ethers";
import noop from "lodash/noop";
import { useState } from "react";
import useSWR from "swr";
import { useAccount } from "wagmi";

import { ARBITRUM_SEPOLIA, AVALANCHE_FUJI } from "config/chains";
import { approveTokens } from "domain/tokens";
import { formatBalanceAmount, parseValue } from "lib/numbers";
import { abis } from "sdk/abis";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { IStargate__factory, TokenMessaging__factory } from "typechain-types-stargate";
import { SendParamStruct } from "typechain-types-stargate/interfaces/IStargate";
import { BusRodeEvent } from "typechain-types-stargate/messaging/TokenMessaging";

import Button from "components/Button/Button";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

const USDC_SG = getTokenBySymbol(ARBITRUM_SEPOLIA, "USDC.SG");

const tokenMessagingInterface = TokenMessaging__factory.createInterface();

const usdcSgConfig = ASSETS[TokenName.USDC];

const sourceId = chainAndStageToEndpointId(Chain.ARBSEP, Stage.TESTNET, EndpointVersion.V2);
const destinationId = chainAndStageToEndpointId(Chain.OPTSEP, Stage.TESTNET, EndpointVersion.V2);

// To sign use BrowserProvider
const arbitrumSepoliaProvider = new BrowserProvider(window.ethereum, ARBITRUM_SEPOLIA);
// To read use JsonRpcProvider
const optimismSepoliaProvider = new JsonRpcProvider("https://sepolia.optimism.io", 11155420);

const stargatePoolUSDCArbitrumSepoliaContract = IStargate__factory.connect(StargatePoolUSDCArbitrumSepolia.address);

const usdcSgArbitrumSepoliaContract = new Contract("0x3253a335E7bFfB4790Aa4C25C4250d206E9b9773", abis.ERC20);
const usdcSgOptimismSepoliaContract = new Contract("0x488327236B65C61A6c083e8d811a4E0D3d1D4268", abis.ERC20);

const SEND_MODE_TAXI = 0;
const SEND_MODE_BUS = 1;
const SEND_MODE_DRIVE = 2;

class OftCmd {
  constructor(
    public sendMode: number,
    public passengers: string[]
  ) {}

  toBytes(): string {
    if (this.sendMode === SEND_MODE_TAXI) {
      return "0x";
    } else {
      return solidityPacked(["uint8"], [this.sendMode]);
    }
  }
}

export function StargateV2() {
  const { address, chainId } = useAccount();
  const [inputValue, setInputValue] = useState<string>("");
  const [busMode, setBusMode] = useState<boolean>(false);
  const [tickets, setTickets] = useState<
    {
      ticketId: string;
      passenger: string;
    }[]
  >([]);

  const amount = parseValue(inputValue, USDC_SG.decimals);

  const handleSwap = async () => {
    if (!chainId || !address || amount === undefined || amount <= 0n) return;

    const connectedPool = stargatePoolUSDCArbitrumSepoliaContract.connect(await arbitrumSepoliaProvider.getSigner());

    const nativeDrop = false;
    const mode = busMode ? SEND_MODE_BUS : SEND_MODE_TAXI;
    const tokenAddress = await connectedPool.token();
    const isNative = tokenAddress === ZeroAddress;
    let decimals = 18;
    // let amount = ethers.utils.parseUnits(amountArgument ?? "0", decimals).toString();
    let adjustedAmount = amount;
    const value = isNative ? amount : 0n;
    if (isNative) {
      console.log(`native balance: ${formatEther(await arbitrumSepoliaProvider.getBalance(address))}`);
    } else {
      // const tokenContract = (await hre.ethers.getContractAt("ERC20Token", tokenAddress)) as ERC20Token;
      const tokenContract = new Contract(tokenAddress, abis.ERC20, arbitrumSepoliaProvider);
      decimals = await tokenContract.decimals();
      const balance: bigint = await tokenContract.balanceOf(address);
      console.log(
        `token: ${tokenAddress} balance: ${formatUnits(balance, decimals)} eth: ${formatEther(
          await arbitrumSepoliaProvider.getBalance(address)
        )}`
      );
      const allowance: bigint = await tokenContract.allowance(address, await connectedPool.getAddress());
      console.log(`allowance of ${await connectedPool.getAddress()}: ${formatUnits(allowance, decimals)}`);
      if (allowance < balance) {
        await (
          await tokenContract
            .connect(await arbitrumSepoliaProvider.getSigner())
            .approve(await connectedPool.getAddress(), MaxUint256)
        ).wait();
      }
    }
    const slippage = 100;
    const minAmount = (adjustedAmount * (10000n - BigInt(slippage))) / 10000n;
    const oftCmd: OftCmd = new OftCmd(mode, []);
    const stargateType = await connectedPool.stargateType();
    console.log(
      `stargateType:${stargateType} stargateAddress:${await connectedPool.getAddress()}, oftCmd:${oftCmd.toBytes()}`
    );
    let extraOptions: BytesLike = "0x";
    if (nativeDrop) {
      if (mode === SEND_MODE_TAXI) {
        extraOptions = Options.newOptions()
          .addExecutorNativeDropOption(parseUnits("0.01"), hexlify(addressToBytes32(address)))
          .toBytes();
      } else if (mode === SEND_MODE_BUS) {
        const OPTIONS_TYPE = 1;
        extraOptions = solidityPacked(["uint16", "uint8"], [OPTIONS_TYPE, 1]);
      }
    }

    let composeMsg: BytesLike = "";
    if (composeMsg) {
      if (mode === SEND_MODE_TAXI) {
        const builder = extraOptions.length === 0 ? Options.newOptions() : Options.fromOptions(hexlify(extraOptions));
        extraOptions = builder.addExecutorComposeOption(0, 50000, 0).toBytes();
      } else if (mode === SEND_MODE_BUS) {
        const OPTIONS_TYPE = 1;
        if (extraOptions.length === 0) {
          extraOptions = solidityPacked(["uint16", "uint128", "uint128"], [OPTIONS_TYPE, 50000, 0]);
          console.log(`extraOptions:${extraOptions.length}`);
        } else {
          extraOptions = solidityPacked(["uint16", "uint128", "uint128", "uint8"], [OPTIONS_TYPE, 50000, 0, 1]);
        }
      }
    }
    const sendParams: SendParamStruct = {
      dstEid: destinationId,
      to: hexlify(addressToBytes32(address)),
      amountLD: adjustedAmount,
      minAmountLD: minAmount,
      extraOptions: hexlify(extraOptions),
      composeMsg: hexlify(toUtf8Bytes(composeMsg ?? "")),
      oftCmd: oftCmd.toBytes(),
    };

    const [nativeFee, lzTokenFee] = await connectedPool.quoteSend(sendParams, false);
    console.log(`nativeFee:${nativeFee.toString()} lzTokenFee:${lzTokenFee.toString()}`);
    console.log(`sendParams:${JSON.stringify(sendParams)}`);
    const receipt = await (
      await connectedPool.sendToken(sendParams, { nativeFee, lzTokenFee }, address, {
        value: nativeFee + value,
        // gasPrice,
      })
    ).wait();

    if (!receipt) {
      throw new Error("No receipt");
    }

    console.log(`Stargate.send() with mode ${mode} tx hash: ${receipt.hash}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
  };

  const balanceUsdcSgArbitrumSepolia = useSWR(address ? ["balance", address, ARBITRUM_SEPOLIA] : null, {
    fetcher: async () => {
      try {
        const balance = await usdcSgArbitrumSepoliaContract.connect(arbitrumSepoliaProvider).balanceOf(address);
        return balance;
      } catch (error) {
        return 0n;
      }
    },
    refreshInterval: 5000,
  });

  const balanceUsdcDestinationFuji = useSWR(address ? ["balance", address, AVALANCHE_FUJI] : null, {
    fetcher: async () => {
      try {
        const balance = await usdcSgOptimismSepoliaContract.connect(optimismSepoliaProvider).balanceOf(address);
        return balance;
      } catch (error) {
        return 0n;
      }
    },
    refreshInterval: 5000,
  });

  // const handleFlush = async () => {
  //   if (!chainId || !address || amount === undefined || amount <= 0n) return;

  //   // const connectedRouter = stargateRouter.connect(await arbitrumSepoliaProvider.getSigner()) as Contract;
  //   const connectedPool = stargatePoolUSDCArbitrumSepoliaContract.connect(await arbitrumSepoliaProvider.getSigner());

  //   let passengersInfo = "0x" + tickets.map((p) => p.passenger.replace("0x", "")).join("");

  //   const sendParams: SendParamStruct = {
  //     dstEid: destinationId,
  //     to: addressToBytes32(address),
  //     amountLD: amount,
  //     minAmountLD: amount / 2n,
  //     extraOptions: new Uint8Array(),
  //     composeMsg: new Uint8Array(),
  //     oftCmd: busMode ? passengersInfo : new Uint8Array(),
  //   };

  //   const [nativeFee]: [nativeFee: bigint, lzTokenFee: bigint] = await connectedPool.quoteSend(sendParams, false);

  //   try {
  //     const tx = await connectedPool.sendToken(
  //       sendParams,
  //       {
  //         nativeFee: nativeFee,
  //         lzTokenFee: 0n,
  //       },
  //       address,
  //       {
  //         value: nativeFee,
  //       }
  //     );

  //     console.log("tx", tx);

  //     // print return data
  //     console.log("waiting for tx");

  //     const returnData = await tx.wait(1);
  //     console.log("returnData", returnData);
  //   } catch (error) {
  //     const stargateV2Error = new Contract(ZeroAddress, StargateV2ErrorsAbi);

  //     const errorMessage = stargateV2Error.interface.parseError(error.data);
  //     console.log("errorMessage", errorMessage);
  //   }
  // };

  return (
    <div className="flex flex-col gap-16">
      <div className="flex min-w-[400px] flex-col gap-8 rounded-4 bg-slate-800 p-16">
        <h1 className="text-h1 leading-base">Debug Stargate V2</h1>
        <p>Wallet chain must be {endpointIdToChainKey(sourceId).toString()}</p>
        <ToggleSwitch isChecked={busMode} setIsChecked={setBusMode}>
          Bus mode
        </ToggleSwitch>
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
          label={`Balance ${endpointIdToChainKey(sourceId).toString()} USDC.SG`}
          value={formatBalanceAmount(balanceUsdcSgArbitrumSepolia.data, USDC_SG.decimals)}
        />
        <SyntheticsInfoRow
          label={`Balance ${endpointIdToChainKey(destinationId).toString()} USDC.SG`}
          value={formatBalanceAmount(balanceUsdcDestinationFuji.data, USDC_SG.decimals)}
        />
        <NumberInput value={inputValue} onValueChange={(e) => setInputValue(e.target.value)} placeholder="0.0" />
        <Button type="button" variant="primary" onClick={handleSwap}>
          Swap
        </Button>
      </div>

      {busMode && (
        <div className="flex min-w-[400px] flex-col gap-8 rounded-4 bg-slate-800 p-16">
          <Button
            type="button"
            variant="primary"
            onClick={async () => {
              const messaging = TokenMessaging__factory.connect(
                TokenMessagingArbitrumSepolia.address,
                arbitrumSepoliaProvider
              );

              // const queue = await messaging.busQueues(dstEid)
              const queue = await messaging.busQueues(destinationId);

              const nextTicketId = queue.nextTicketId;
              const queueLength = queue.qLength;
              console.log("nextTicketId:", nextTicketId.toString());
              console.log("queue length:", queueLength.toString());
              if (queueLength === 0n) {
                console.error("No passengers found!");
                return;
              }
              let allRideEvents = (await messaging.queryFilter(messaging.filters.BusRode())).filter(
                (e) => e.args.dstEid === BigInt(destinationId) && e.args.ticketId >= nextTicketId
              );

              // sort by oldest to newest
              allRideEvents = allRideEvents.toSorted((a, b) => Number(a.args.ticketId) - Number(b.args.ticketId));

              allRideEvents = allRideEvents.slice(0, Number(queue.maxNumPassengers));

              const passengers = allRideEvents.map((e) => e.args.passenger);
              console.log("passengers:", passengers);
              let passengersInfo = "0x" + passengers.map((p) => p.replace("0x", "")).join("");
              // passengersInfo = solidityPacked(["uint8", "uint56"], [passengers.length, nextTicketId]) + passengersInfo;
              const [nativeFee] = await messaging.quoteDriveBus(destinationId, passengersInfo);
              const receipt = await (
                await messaging
                  .connect(await arbitrumSepoliaProvider.getSigner())
                  .driveBus(destinationId, passengersInfo, { value: nativeFee })
              ).wait();
              if (!receipt) {
                throw new Error("No receipt");
              }
              console.log(`Messaging.driveBus() tx hash: ${receipt.hash}`);
              console.log(`Gas used: ${receipt.gasUsed.toString()}`);
            }}
          >
            Drive bus
          </Button>
        </div>
      )}
    </div>
  );
}
