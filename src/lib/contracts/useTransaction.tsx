// TODO?
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useWeb3React } from "@web3-react/core";
// import { isSupportedChain } from "config/chains";
// import { BigNumber, ethers } from "ethers";
// import { getGasLimit, setGasPrice } from "./utils";

// export function useTransaction(p) {
//   // Use exact wallet chainId
//   const { chainId, library } = useWeb3React();

//   async function sendTransaction(p: {
//     contractAddress: string;
//     abi: any;
//     method: string;
//     params: any[];
//     value?: BigNumber;
//     gasLimit?: BigNumber;
//   }) {
//     try {
//       if (!chainId || !isSupportedChain(chainId)) {
//         return;
//       }

//       const contract = new ethers.Contract(p.contractAddress, p.abi, library.getSigner());

//       const gasLimit = p.gasLimit || (await getGasLimit(contract, p.method, p.params, p.value));

//       await setGasPrice({ gasLimit, value: p.value }, contract.provider, chainId);

//       const result = await contract[p.method](...p.params, { gasLimit, value: p.value });
//     } catch (e) {

//     }
//   }
// }
