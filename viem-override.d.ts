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

declare module "viem/node_modules/abitype" {
  export interface Register {
    addressType: string;
    bytesType: {
      inputs: string;
      outputs: `0x${string}`;
    };
    bigIntType: bigint;
  }
}

declare module "./sdk/node_modules/abitype" {
  export interface Register {
    addressType: string;
    bytesType: {
      inputs: string;
      outputs: `0x${string}`;
    };
    bigIntType: bigint;
  }
}
