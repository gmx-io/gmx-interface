// // Define provider
// // const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_PROVIDER_HERE');

// import { AbiCoder, Contract, JsonRpcProvider } from "ethers";
// import { optimismSepolia } from "viem/chains";

// import { OPTIMISM_SEPOLIA } from "sdk/configs/chains";

// const provider = new JsonRpcProvider(optimismSepolia.rpcUrls.default.http[0], OPTIMISM_SEPOLIA);

// // Define the smart contract address and ABI
// const ethereumLzEndpointAddress = "0x6EDCE65403992e310A62460808c4b910D972f10f";
// const ethereumLzEndpointABI = [
//   "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)",
// ];

// // Create a contract instance
// const contract = new Contract(ethereumLzEndpointAddress, ethereumLzEndpointABI, provider);

// // Define the addresses and parameters
// const oappAddress = "0x314B753272a3C79646b92A87dbFDEE643237033a";
// const sendLibAddress = "0xB31D2cb502E25B30C651842C7C3293c51Fe6d16f";
// const receiveLibAddress = "0x75Db67CDab2824970131D5aa9CECfC9F69c69636";
// const remoteEid = 40231; // Example target endpoint ID, Binance Smart Chain
// const executorConfigType = 1; // 1 for executor
// const ulnConfigType = 2; // 2 for UlnConfig

// async function getConfigAndDecode() {
//   try {
//     // Fetch and decode for sendLib (both Executor and ULN Config)
//     const sendExecutorConfigBytes = await contract.getConfig(
//       oappAddress,
//       sendLibAddress,
//       remoteEid,
//       executorConfigType
//     );
//     const executorConfigAbi = ["tuple(uint32 maxMessageSize, address executorAddress)"];
//     const executorConfigArray = AbiCoder.defaultAbiCoder().decode(executorConfigAbi, sendExecutorConfigBytes);
//     console.log("Send Library Executor Config:", executorConfigArray);

//     const sendUlnConfigBytes = await contract.getConfig(oappAddress, sendLibAddress, remoteEid, ulnConfigType);
//     const ulnConfigStructType = [
//       "tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)",
//     ];
//     const sendUlnConfigArray = AbiCoder.defaultAbiCoder().decode(ulnConfigStructType, sendUlnConfigBytes);
//     console.log("Send Library ULN Config:", sendUlnConfigArray);

//     // Fetch and decode for receiveLib (only ULN Config)
//     const receiveUlnConfigBytes = await contract.getConfig(oappAddress, receiveLibAddress, remoteEid, ulnConfigType);
//     const receiveUlnConfigArray = AbiCoder.defaultAbiCoder().decode(ulnConfigStructType, receiveUlnConfigBytes);
//     console.log("Receive Library ULN Config:", receiveUlnConfigArray);
//   } catch (error) {
//     console.error("Error fetching or decoding config:", error);
//   }
// }

// // Execute the function
// getConfigAndDecode();

export {};
