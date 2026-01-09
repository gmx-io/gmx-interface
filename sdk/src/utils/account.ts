import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// use a random placeholder account instead of the zero address as the zero address might have tokens
export const PLACEHOLDER_ACCOUNT = privateKeyToAccount(generatePrivateKey()).address;
