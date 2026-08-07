import { getAddress, keccak256, stringToHex, type Hash } from "viem";

export const BALANCER_PROGRAM_ANNOUNCEMENT_FLAG = "showBalancerProgramAnnouncement";
export const BALANCER_PROGRAM_ANNOUNCEMENT_END_TIMESTAMP = Date.UTC(2027, 0, 1);

export const BALANCER_PROGRAM_PROSPECT_ADDRESS_HASHES = new Set<Hash>([
  "0x2f8cb7da234bdf54189725302b56afe1a7788c586a94bc04f5327bc8ef5688ed",
  "0x0306c1cb263500ff06e7b0204cfb73c0299b971b06b90a7a99c610c41e7c2231",
  "0xd8f5346d4695afed792e418d391b7aac2eb8fb186b9236f5e0c7e1bfb21c8727",
  "0x52cef26314775045686d09d3c270a82682b90262f43e571b4223d9ed4d19ac19",
  "0x35b547e3696b63479c882da53ca3ed13126e8eaeca207e3227c7119c5a727251",
  "0xfd3ac5bc8f0891c38926ba0fe2b90ae9ffdce47e24415d16828fa0e0e076a8e0",
  "0xc54c6dfcfa9bf2a5f180c3eac4799172d8005f7ced7bcc39a5eaab40be77f8d5",
  "0x4f6fcfe414d54beb575e9f81c19efd76669d24cc3511f47b8fda96ef08450fb1",
  "0x4fe0a52f380bcdc791f3157cdcf312e6f1966c3c0c53788cc6685283b62357f1",
]);

export function getBalancerProgramAddressHash(address: string | undefined): Hash | undefined {
  if (!address) return undefined;

  try {
    return keccak256(stringToHex(getAddress(address)));
  } catch {
    return undefined;
  }
}

export function shouldShowBalancerProgramAnnouncement({
  accountHash,
  flagEnabled,
  isDismissed,
  now,
}: {
  accountHash: Hash | undefined;
  flagEnabled: boolean;
  isDismissed: boolean;
  now: number;
}): boolean {
  return (
    flagEnabled &&
    !isDismissed &&
    now < BALANCER_PROGRAM_ANNOUNCEMENT_END_TIMESTAMP &&
    accountHash !== undefined &&
    BALANCER_PROGRAM_PROSPECT_ADDRESS_HASHES.has(accountHash)
  );
}
