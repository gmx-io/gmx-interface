// numeric values predate GMX Relay: they shipped with the Gelato-era client and live in persisted
// task statuses and metrics, so they survive the provider they came from
export enum StatusCode {
  Pending = 100,
  Submitted = 110,
  Success = 200,
  Rejected = 400,
  Reverted = 500,
}
