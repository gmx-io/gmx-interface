/* 
  This files is used to pre-build data during the build process.
  Avoid adding client-side code here, as it can break the build process.

  However, this files can be a dependency for the client code.
*/

export * from "sdk/configs/chains";

export const FEES_HIGH_BPS = 50;
