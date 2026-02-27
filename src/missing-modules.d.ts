declare module "crypto-js" {
  const cryptoJs: {
    SHA256(message: string | undefined): { toString(encoding?: unknown): string };
    AES: {
      encrypt(message: string, key: string): { toString(): string };
      decrypt(ciphertext: string, key: string): { toString(encoding: unknown): string };
    };
    enc: { Hex: unknown; Utf8: unknown };
  };
  export const SHA256: typeof cryptoJs.SHA256;
  export const AES: typeof cryptoJs.AES;
  export const enc: typeof cryptoJs.enc;
  export default cryptoJs;
}

declare module "react-helmet" {
  export function Helmet(props: { children?: any }): any;
}

declare module "recharts/es6/context/chartLayoutContext" {
  export function useOffset(): any;
  export function useViewBox(): any;
  export function useYAxisWithFiniteDomainOrRandom(axisId?: any): any;
}

declare module "shallowequal" {
  function shallowEqual(a: any, b: any): boolean;
  export default shallowEqual;
}
