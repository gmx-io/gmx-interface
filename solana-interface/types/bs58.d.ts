declare module "bs58" {
  const bs58: {
    encode(value: Uint8Array): string;
    decode(value: string): Uint8Array;
  };

  export default bs58;
}
