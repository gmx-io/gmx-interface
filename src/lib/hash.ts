import { AbiCoder, ethers } from "ethers";

export function hashData(dataTypes, dataValues) {
  const bytes = AbiCoder.defaultAbiCoder().encode(dataTypes, dataValues);
  const hash = ethers.keccak256(ethers.getBytes(bytes));

  return hash;
}

export function hashString(string: string) {
  return hashData(["string"], [string]);
}
