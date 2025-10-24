import "abitype";

declare module "abitype" {
  export interface Register {
    addressType: string;
    bytesType: {
      inputs: string;
      outputs: `0x${string}`;
    };
    bigIntType: bigint;
  }
}
