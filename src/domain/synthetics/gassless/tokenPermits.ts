import { BigNumberish, Signature } from "ethers";

export async function getTokenPermit(
  token: any,
  signer: any,
  spender: string,
  value: BigNumberish,
  nonce: BigNumberish,
  deadline: BigNumberish,
  chainId: BigNumberish
) {
  const permitSignature = await getPermitSignature(token, signer, spender, value, nonce, deadline, chainId);
  const { v, r, s } = Signature.from(permitSignature);
  return {
    owner: signer.address,
    spender,
    value,
    deadline,
    v,
    r,
    s,
    token: token.address,
  };
}

async function getPermitSignature(
  token: any,
  signer: any,
  spender: string,
  value: BigNumberish,
  nonce: BigNumberish,
  deadline: BigNumberish,
  chainId: BigNumberish
) {
  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const tokenName = await token.name();
  const tokenVersion = "1";
  const domain = {
    name: tokenName,
    version: tokenVersion,
    chainId,
    verifyingContract: token.address,
  };
  const typedData = {
    owner: signer.address,
    spender: spender,
    value: value,
    nonce: nonce,
    deadline: deadline,
  };
  return signer._signTypedData(domain, types, typedData);
}
