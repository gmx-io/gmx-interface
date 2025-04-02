import { createPublicClient, http, erc20Abi } from "viem";
import { arbitrumSepolia } from "viem/chains";

const data = [
  [
    "0x482df3d320c964808579b585a8ac7dd5d144efaf",
    "0x980b62da83eff3d4576c647993b0c1d7faf17c73",
    "0x980b62da83eff3d4576c647993b0c1d7faf17c73",
    "0x3321fd36aeab0d5cdfd26f4a3a93e2d2aaccb99f",
  ],
  [
    "0xbb532ab4923c23c2bfa455151b14fec177a34c0d",
    "0xf79ce1cf38a09d572b021b4c5548b75a14082f12",
    "0xf79ce1cf38a09d572b021b4c5548b75a14082f12",
    "0x3321fd36aeab0d5cdfd26f4a3a93e2d2aaccb99f",
  ],
];

async function getTokenSymbols(addresses: `0x${string}`[]) {
  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(),
  });

  const uniqueAddresses = [...new Set(addresses.flat())];

  const symbols = await Promise.all(
    uniqueAddresses.map(async (address) => {
      try {
        const symbol = await client.readContract({
          address,
          abi: erc20Abi,
          functionName: "symbol",
        });
        return { address, symbol };
      } catch (error) {
        console.error(`Failed to fetch symbol for ${address}:`, error);
        return { address, symbol: "UNKNOWN" };
      }
    })
  );

  return symbols;
}

// Usage example:
const flatAddresses = data.flat() as `0x${string}`[];
getTokenSymbols(flatAddresses).then(console.log);
