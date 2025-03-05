# Gasless docs

With Gasless orders users do not send transactions directly to the blockchain (RPC), instead they sign a payload with private key, send payload with signature to so called “Relay” that sends transaction. Our contracts validate the payload and the signature to make sure it wasn’t forged and was signed indeed signed but the user. Then the relay fee is sent to the relay fee collector wallet, that’s how the Relay gets paid. And then contracts process order as usual

## Highlevel (simplified) flow:

- UI prepares payload that includes:
  - order params (i.e. market, isLong, collateralDelta amount, etc)
  - relay params:
    - user nonce – similar to the native nonce, but should be read from contract instead
    - deadline – after the deadline the txn can’t be sent
    - fee params: token, fee amount, swap path
  - oracle params – should be provided if a swap required
- generates signature (with either user wallet or subaccount private key)
- sends payload and signature to the Gelato Relay
- the Relay returns requestId that can be used to get the status of the request

Gelato provides [SDK](https://docs.gelato.network/web3-services/relay/relay-sdk-with-viem) that can be used for interactions with Gelato Relay

## `RelayParams`

Source code https://github.com/gmx-io/gmx-synthetics/blob/gasless/contracts/router/relay/BaseGelatoRelayRouter.sol#L42

- `oracleParams` should be provided if swap required. For example, if user wants to pay for gas with USDC then it should be swapped for WETH. only tokens with existing on-chain Chainlink price fees could be used. And different (higher) fee will be applied to this swap because it’s atomic and could be front-run otherwise
  - `tokens` array of tokens, for example [WETH, USDC]
  - `providers` array of providers for each token. Should be array of `ChainlinkPriceFeedProvider` addresses. For example for Arbitrum: `[0x527FB0bCfF63C47761039bB386cFE181A92a4701**,** 0x527FB0bCfF63C47761039bB386cFE181A92a4701]`
  - `data` array with empty bytes, for example: `["0x", "0x"]`
- `tokenPermits` array of `TokenPermit` structs. Will be used to call `ERC20.permit()` to approve user tokens without a need to send a separate transaction
  - `owner` user address
  - `spender` GMX `Router` contract address
  - `value` amount to spend
  - `deadline`
  - `v` , `r` , `s` – components of the signature (this is a separate permit signature). A signature could be split into this components with `ethers.utils.splitSignature`**.** Example \*\*\*\*https://github.com/gmx-io/gmx-synthetics/blob/gasless/utils/relay/tokenPermit.ts#L3
  - `token` token address (e.g. USDC)
- `fee`
  - `feeToken` any token that supported on GMX and can be swapped to WNT (WETH or WAVAX) can be used. If non-WNT token provided, then `feeSwapPath` and `oracleParams` should be provided
  - `feeAmount` should cover both relay fee and execution fee
  - `feeSwapPath` required if `feeToken` ≠ WNT

## `SubaccountApproval`

Existing `SubaccountRouter` requires user to send a multicall transaction to configure the subaccount (approve subaccount address, set max actions, etc) before a subaccount can trade on behalf of user.

New `SubaccountGelatoRelayRouter` supports different flow with not extra transactions:

- main account signs message (subaccount approval) with params for subaccount configuration (like max actions)
- subaccount sends transaction to `SubaccountGelatoRelayRouter` and passes `subaccountApproval` data
- the contract validates that `subaccountApproval` was signed by the main account and uses it’s data to update contracts configuration

`SubaccountApproval` struct:

- `subaccount` \*\*\*\*address of the subaccount
- `shouldAdd` a boolean, should be true if subaccount if not whitelisted yet.
- `expiresAt` timestamp until which the subaccount is active. Skipped if set to 0
- `maxAllowedCount` \*\*\*\*skipped if set to 0
- `actionType`
- `nonce` nonce that used in signature generation. Should be read from `SubaccountGelatoRelayRouter.subaccountApprovalNonces` \*\*\*\*
- `deadline` deadline for the subaccount approval signature
- `signature`

Example of subaccount approval signature generation https://github.com/gmx-io/gmx-synthetics/blob/gasless/utils/relay/subaccountGelatoRelay.ts#L389

## Creating signature

The standard is described here https://eips.ethereum.org/EIPS/eip-2771

Signature depends on the payload that the function accepts, so for each function the signature generation works differently.

Examples:

- GelatoRelayRouter https://github.com/gmx-io/gmx-synthetics/blob/gasless/utils/relay/gelatoRelay.ts#L59
- SubaccountGelatoRelayRouter (1ct) https://github.com/gmx-io/gmx-synthetics/blob/gasless/utils/relay/subaccountGelatoRelay.ts#L101

## Links

- Gelato Relay docs https://docs.gelato.network/developer-services/relay
- `GelatoRelayRouter` (non-1ct) contract https://github.com/gmx-io/gmx-synthetics/blob/gasless/contracts/router/relay/GelatoRelayRouter.sol#L59
- `SubaccountGelatoRelayRouter` (1ct) contract https://github.com/gmx-io/gmx-synthetics/blob/gasless/contracts/router/relay/SubaccountGelatoRelayRouter.sol#L68
- How to estimate relay fee https://docs.gelato.network/web3-services/relay/gelatos-fee-oracle
- SDK example https://github.com/gelatodigital/relay-sdk-viem-examples/blob/main/scripts/non-erc2771/callWithSyncFee.ts
- Signature standard https://eips.ethereum.org/EIPS/eip-2771
- how to generate ERC2771 signature with ethers https://docs.ethers.org/v5/api/signer/#Signer-signTypedData
