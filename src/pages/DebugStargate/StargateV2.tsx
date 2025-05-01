// /* eslint-disable no-console */
// import { endpointIdToChainKey } from "@layerzerolabs/lz-definitions";
// import { Options, addressToBytes32 } from "@layerzerolabs/lz-v2-utilities";
// import { createClient } from "@layerzerolabs/scan-client";
// import { ASSETS, TokenName } from "@stargatefinance/stg-definitions-v2";
// import { errors as StargateV2ErrorsAbi } from "@stargatefinance/stg-evm-sdk-v2";
// import {
//   AbiCoder,
//   BrowserProvider,
//   BytesLike,
//   Contract,
//   InterfaceAbi,
//   JsonRpcApiProvider,
//   JsonRpcProvider,
//   MaxUint256,
//   ZeroAddress,
//   formatEther,
//   formatUnits,
//   hexlify,
//   parseUnits,
//   solidityPacked,
// } from "ethers";
// import { useEffect, useState } from "react";
// import useSWR from "swr";
// import { useAccount } from "wagmi";

// import { ARBITRUM_SEPOLIA, OPTIMISM_SEPOLIA, RPC_PROVIDERS } from "config/chains";
// import {
//   ARBITRUM_SEPOLIA_STARGATE_ENDPOINT_ID,
//   CHAIN_ID_TO_ENDPOINT_ID,
//   OPTIMISM_SEPOLIA_STARGATE_ENDPOINT_ID,
//   usdcSgPoolArbitrumSepolia,
//   usdcSgPoolOptimismSepolia,
// } from "context/GmxAccountContext/stargatePools";
// import { formatBalanceAmount, parseValue } from "lib/numbers";
// import { abis } from "sdk/abis";
// import { getTokenBySymbol } from "sdk/configs/tokens";
// import { LayerZeroProvider__factory } from "typechain-types-arbitrum-sepolia";
// import { IStargate__factory } from "typechain-types-stargate";
// import { IStargate, SendParamStruct } from "typechain-types-stargate/interfaces/IStargate";

// import Button from "components/Button/Button";
// import NumberInput from "components/NumberInput/NumberInput";
// import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";

// import { CodecUiHelper, OFTComposeMsgCodec } from "./OFTComposeMsgCodec";

// const client = createClient("testnet");
// const USDC_SG = getTokenBySymbol(ARBITRUM_SEPOLIA, "USDC.SG");

// // const tokenMessagingInterface = TokenMessaging__factory.createInterface();

// const usdcSgConfig = ASSETS[TokenName.USDC];

// const USDC_SG_TOKEN_ADDRESSES = {
//   [ARBITRUM_SEPOLIA]: usdcSgConfig.networks[ARBITRUM_SEPOLIA_STARGATE_ENDPOINT_ID]!.address,
//   [OPTIMISM_SEPOLIA]: usdcSgConfig.networks[OPTIMISM_SEPOLIA_STARGATE_ENDPOINT_ID]!.address,
// };

// const stargateV2Abi = IStargate__factory.abi as InterfaceAbi;
// const stargateV2ErrorsAbi = StargateV2ErrorsAbi as InterfaceAbi;

// const stargateV2AbiConcatErrorsAbi = [...stargateV2Abi, ...stargateV2ErrorsAbi];

// function getStargateV2(address: string) {
//   return new Contract(address, stargateV2AbiConcatErrorsAbi) as unknown as IStargate;
// }

// const reieverArbitrumSSepoliaAddress = "0xa132826C0D28f6626534b1Ca6fD7b2c32dd289e5";

// // const receiverContract = LayerZeroProvider__factory.connect(
// //   reieverArbitrumSSepoliaAddress,
// //   new JsonRpcProvider(RPC_PROVIDERS[ARBITRUM_SEPOLIA][0], ARBITRUM_SEPOLIA)
// // );

// const receiverContract = new Contract(
//   reieverArbitrumSSepoliaAddress,
//   LayerZeroProvider__factory.abi.concat(abis.CustomErrorsArbitrumSepolia as any[]).concat(stargateV2ErrorsAbi as any[]),
//   new JsonRpcProvider(RPC_PROVIDERS[ARBITRUM_SEPOLIA][0], ARBITRUM_SEPOLIA)
// );

// const SEND_MODE_TAXI = 0;
// const SEND_MODE_BUS = 1;

// class OftCmd {
//   constructor(
//     public sendMode: number,
//     public passengers: string[]
//   ) {}

//   toBytes(): string {
//     if (this.sendMode === SEND_MODE_TAXI) {
//       return "0x";
//     } else {
//       return solidityPacked(["uint8"], [this.sendMode]);
//     }
//   }
// }

// // address account, uint256 srcChainId

// export function StargateV2() {
//   const { address, chainId, connector } = useAccount();

//   const sourceId = chainId !== undefined ? CHAIN_ID_TO_ENDPOINT_ID[chainId] : undefined;

//   const [destinationChainId, setDestinationChainId] = useState<number>(ARBITRUM_SEPOLIA);
//   const destinationId = destinationChainId !== undefined ? CHAIN_ID_TO_ENDPOINT_ID[destinationChainId] : undefined;

//   const [inputValue, setInputValue] = useState<string>("");

//   const [sourceChainProvider, setSourceChainProvider] = useState<JsonRpcApiProvider | undefined>();
//   const [destinationChainReadonlyProvider, setDestinationChainReadonlyProvider] = useState<
//     JsonRpcApiProvider | undefined
//   >();

//   useEffect(() => {
//     // connector?.getProvider?.().then((res) => setSourceChainProvider(res as JsonRpcApiProvider));
//     setSourceChainProvider(new BrowserProvider(window.ethereum, chainId));
//   }, [chainId, connector]);

//   useEffect(() => {
//     setDestinationChainReadonlyProvider(new JsonRpcProvider(RPC_PROVIDERS[destinationChainId][0], destinationChainId));
//   }, [destinationChainId]);

//   const amount = parseValue(inputValue, USDC_SG.decimals);

//   const composeGasQuery = useSWR(
//     address && destinationChainReadonlyProvider ? ["composeGas", address, destinationChainId] : null,
//     {
//       fetcher: async () => {
//         if (!address || !destinationChainReadonlyProvider || amount === undefined || amount <= 0n) {
//           return 0n;
//         }

//         const composeFrom = hexlify(addressToBytes32("0x6EDCE65403992e310A62460808c4b910D972f10f"));
//         const composeMsg = CodecUiHelper.composeMessage(ARBITRUM_SEPOLIA, address, ARBITRUM_SEPOLIA);

//         const composeFromWithMsg = composeFrom + composeMsg.slice("0x".length);

//         const message = OFTComposeMsgCodec.encode(0, ARBITRUM_SEPOLIA_STARGATE_ENDPOINT_ID, amount, composeFromWithMsg);

//         const composeMsg2 = OFTComposeMsgCodec.composeMsg(message);
//         const decodeResult = CodecUiHelper.decodeDepositMessage(composeMsg2);

//         console.log(`message:${message}`);
//         try {
//           const gas = await receiverContract.lzCompose.estimateGas(
//             "0x543BdA7c6cA4384FE90B1F5929bb851F52888983",
//             new Uint8Array(32),
//             message,
//             ZeroAddress,
//             new Uint8Array([0]),
//             { from: "0x6EDCE65403992e310A62460808c4b910D972f10f" }
//           );

//           console.log(`gas:${gas}`);

//           return gas;
//         } catch (error) {
//           console.error(error);
//           return 0n;
//         }
//       },
//       refreshInterval: 5000,
//     }
//   );

//   // const composeGas =
//   //   (composeGasQuery.data as bigint | undefined) !== undefined
//   //     ? bigMath.mulDiv(composeGasQuery.data as bigint, 20n, 10n)
//   //     : 700_000n;

//   const composeGas = 700_000n;

//   const handleSwap = async () => {
//     if (
//       !chainId ||
//       !sourceChainProvider ||
//       !address ||
//       amount === undefined ||
//       amount <= 0n ||
//       destinationId === undefined
//     )
//       return;

//     const signer = await sourceChainProvider.getSigner();

//     const sourceChainStargate = getStargateV2(USDC_SG_POOL_ADDRESSES[chainId]);

//     const connectedPool = sourceChainStargate.connect(signer);

//     const nativeDrop = false;
//     const mode = SEND_MODE_TAXI;
//     const tokenAddress = await connectedPool.token();
//     const isNative = tokenAddress === ZeroAddress;
//     let decimals = USDC_SG.decimals;
//     // let amount = ethers.utils.parseUnits(amountArgument ?? "0", decimals).toString();
//     let adjustedAmount = amount;
//     const value = isNative ? amount : 0n;
//     if (isNative) {
//       console.log(`native balance: ${formatEther(await sourceChainProvider.getBalance(address))}`);
//     } else {
//       // const tokenContract = (await hre.ethers.getContractAt("ERC20Token", tokenAddress)) as ERC20Token;
//       const tokenContract = new Contract(tokenAddress, abis.ERC20, sourceChainProvider);
//       decimals = await tokenContract.decimals();
//       const balance: bigint = await tokenContract.balanceOf(address);
//       console.log(
//         `token: ${tokenAddress} balance: ${formatUnits(balance, decimals)} eth: ${formatEther(
//           await sourceChainProvider.getBalance(address)
//         )}`
//       );
//       const allowance: bigint = await tokenContract.allowance(address, await connectedPool.getAddress());
//       console.log(`allowance of ${await connectedPool.getAddress()}: ${formatUnits(allowance, decimals)}`);
//       if (allowance < balance) {
//         await (
//           await tokenContract
//             .connect(signer)
//             // @ts-ignore
//             .approve(await connectedPool.getAddress(), MaxUint256)
//         ).wait();
//       }
//     }
//     const slippage = 100;
//     const minAmount = (adjustedAmount * (10000n - BigInt(slippage))) / 10000n;
//     const oftCmd: OftCmd = new OftCmd(mode, []);
//     const stargateType = await connectedPool.stargateType();
//     console.log(
//       `stargateType:${stargateType} stargateAddress:${await connectedPool.getAddress()}, oftCmd:${oftCmd.toBytes()}`
//     );
//     let extraOptions: BytesLike = "";
//     if (nativeDrop) {
//       if (mode === SEND_MODE_TAXI) {
//         extraOptions = Options.newOptions()
//           .addExecutorNativeDropOption(parseUnits("0.01"), hexlify(addressToBytes32(address)))
//           .toBytes();
//       } else if (mode === SEND_MODE_BUS) {
//         const OPTIONS_TYPE = 1;
//         extraOptions = solidityPacked(["uint16", "uint8"], [OPTIONS_TYPE, 1]);
//       }
//     }

//     let composeMsg: BytesLike = CodecUiHelper.encodeDepositMessage(address, ARBITRUM_SEPOLIA);
//     if (composeMsg) {
//       if (mode === SEND_MODE_TAXI) {
//         const builder = extraOptions.length === 0 ? Options.newOptions() : Options.fromOptions(hexlify(extraOptions));

//         extraOptions = builder.addExecutorComposeOption(0, composeGas, 0).toBytes();
//       } else if (mode === SEND_MODE_BUS) {
//         const OPTIONS_TYPE = 1;
//         if (extraOptions.length === 0) {
//           extraOptions = solidityPacked(["uint16", "uint128", "uint128"], [OPTIONS_TYPE, 50000, 0]);
//           console.log(`extraOptions:${extraOptions.length}`);
//         } else {
//           extraOptions = solidityPacked(["uint16", "uint128", "uint128", "uint8"], [OPTIONS_TYPE, 50000, 0, 1]);
//         }
//       }
//     }
//     const sendParams: SendParamStruct = {
//       dstEid: destinationId,
//       to: hexlify(addressToBytes32(reieverArbitrumSSepoliaAddress)),
//       amountLD: adjustedAmount,
//       minAmountLD: minAmount,
//       extraOptions: hexlify(extraOptions),
//       composeMsg: composeMsg ?? "",
//       oftCmd: oftCmd.toBytes(),
//     };

//     const [nativeFee, lzTokenFee] = await connectedPool.quoteSend(sendParams, false);
//     console.log(`nativeFee:${nativeFee.toString()} lzTokenFee:${lzTokenFee.toString()}`);
//     console.log(`sendParams:${JSON.stringify(sendParams)}`);
//     const receipt = await (
//       await connectedPool.sendToken(sendParams, { nativeFee, lzTokenFee }, address, {
//         value: nativeFee + value,
//         // gasPrice,
//       })
//     ).wait();

//     if (!receipt) {
//       throw new Error("No receipt");
//     }

//     console.log(`Stargate.send() with mode ${mode} tx hash: ${receipt.hash}`);
//     console.log(`Gas used: ${receipt.gasUsed.toString()}`);
//   };

//   const balanceUsdcSgSourceChain = useSWR(
//     address && chainId !== undefined && sourceChainProvider ? ["balance", address, chainId] : null,
//     {
//       fetcher: async () => {
//         try {
//           const tokenContract = new Contract(USDC_SG_TOKEN_ADDRESSES[chainId!], abis.ERC20, sourceChainProvider);
//           const balance = await tokenContract.balanceOf(address);
//           return balance;
//         } catch (error) {
//           return 0n;
//         }
//       },
//       refreshInterval: 5000,
//     }
//   );

//   const balanceUsdcSgDestinationChain = useSWR(
//     address && destinationChainReadonlyProvider ? ["balance", address, destinationChainId] : null,
//     {
//       fetcher: async () => {
//         const tokenContract = new Contract(
//           USDC_SG_TOKEN_ADDRESSES[destinationChainId],
//           abis.ERC20,
//           destinationChainReadonlyProvider
//         );
//         const balance = await tokenContract.balanceOf(address);
//         return balance;
//       },
//       refreshInterval: 5000,
//     }
//   );

//   // reieverArbitrumSSepoliaAddress call lzCompose()

//   // receiverContract.

//   // msg.sender must be 0x6EDCE65403992e310A62460808c4b910D972f10f

//   // from must be 0x314B753272a3C79646b92A87dbFDEE643237033a
//   // guid empty
//   // message OFTComposeMsgCodec
//   // executor empty
//   // extraData empty

//   //   function encode(
//   //     uint64 _nonce,
//   //     uint32 _srcEid,
//   //     uint256 _amountLD,
//   //     bytes memory _composeMsg // 0x[composeFrom][composeMsg]
//   // ) internal pure returns (bytes memory _msg) {
//   //     _msg = abi.encodePacked(_nonce, _srcEid, _amountLD, _composeMsg);
//   // }
//   // const message = solidityPacked(
//   //   ["uint64", "uint32", "uint256", "bytes"],
//   //   [0, ARBITRUM_SEPOLIA_ENDPOINT_ID, amount, composeMsg]
//   // );
//   // // OFT
//   // const gas = await receiverContract.lzCompose.estimateGas(
//   //   "0x314B753272a3C79646b92A87dbFDEE643237033a",
//   //   "0x",
//   //   "0x",
//   //   "0x"
//   // );

//   return (
//     <div className="flex flex-col gap-16">
//       <div className="flex min-w-[400px] flex-col gap-8 rounded-4 bg-slate-800 p-16">
//         <h1 className="text-h1 leading-base">Debug Stargate V2</h1>
//         {sourceId ? (
//           <p>Wallet chain must is {endpointIdToChainKey(sourceId).toString()}</p>
//         ) : (
//           <p>Wallet chain not set</p>
//         )}

//         <SyntheticsInfoRow label="Source Chain endpoint id" value={sourceId} />
//         <SyntheticsInfoRow label="Destination Chain endpoint id" value={destinationId} />
//         <SyntheticsInfoRow
//           label="Source Chain key"
//           value={sourceId ? endpointIdToChainKey(sourceId).toString() : "N/A"}
//         />
//         <SyntheticsInfoRow
//           label="Destination Chain key"
//           value={destinationId ? endpointIdToChainKey(destinationId).toString() : "N/A"}
//         />
//         <SyntheticsInfoRow
//           label="Source Chain config"
//           value={sourceId ? (usdcSgConfig.networks[sourceId] ? "True" : "False") : "N/A"}
//         />
//         <SyntheticsInfoRow
//           label="Destination Chain config"
//           value={destinationId ? (usdcSgConfig.networks[destinationId] ? "True" : "False") : "N/A"}
//         />

//         <SyntheticsInfoRow
//           label={`Balance ${sourceId ? endpointIdToChainKey(sourceId).toString() : "N/A"} USDC.SG`}
//           value={formatBalanceAmount(balanceUsdcSgSourceChain.data, USDC_SG.decimals)}
//         />
//         <SyntheticsInfoRow
//           label={`Balance ${destinationId ? endpointIdToChainKey(destinationId).toString() : "N/A"} USDC.SG`}
//           value={formatBalanceAmount(balanceUsdcSgDestinationChain.data, USDC_SG.decimals)}
//         />
//         <SyntheticsInfoRow
//           label="Compose Gas"
//           value={composeGasQuery.data ? formatUnits(composeGasQuery.data, "wei") : "N/A"}
//         />
//         <NumberInput value={inputValue} onValueChange={(e) => setInputValue(e.target.value)} placeholder="0.0" />
//         <Button type="button" variant="primary" onClick={handleSwap}>
//           Swap
//         </Button>
//       </div>
//     </div>
//   );
// }

// // No Executor Option: Applications can operate without an automated Executor by requiring users to manually invoke lzReceive with transaction data on the destination chain, either using LayerZero Scan or the destination blockchain block explorer.
