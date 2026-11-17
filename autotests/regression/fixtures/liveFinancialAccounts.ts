import { getAddress, parseAbi, type Address, type Hex } from "viem";
import { getContract } from "../../../sdk/src/configs/contracts";
import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import {
  claimableFundingAmountKey,
  multichainBalanceKey,
  CLAIMABLE_COLLATERAL_DELAY_KEY,
  CLAIMABLE_COLLATERAL_TIME_DIVISOR_KEY,
} from "../../../sdk/src/configs/dataStore";
import { fetchApiMarketsInfo } from "../../../sdk/src/utils/markets/api";
import type { LiveAccounts, LiveAccount } from "./liveAccounts";

export type FinancialProfile = "account" | "funding" | "rebate";
export type FinancialEvidence = {
  marketAddress?: Address;
  marketName?: string;
  amount: bigint;
  token: Address;
  decimals: number;
  symbol: string;
};
type Funding = { id: string; amounts: string[]; marketAddresses: string[]; tokenAddresses: string[] };
type Rebate = {
  account: string;
  marketAddress: string;
  tokenAddress: string;
  value: string;
  timeKey: number;
  factor: string;
  factorByTime: string;
  reductionFactor: string;
};

export async function selectFinancialAccount(accounts: LiveAccounts, profile: FinancialProfile): Promise<LiveAccount> {
  const token = getTokenBySymbol(accounts.chainId, "USDC");
  const address = getAddress(token.address);
  const uint = (key: string) =>
    accounts.rpc.readContract({
      address: getAddress(getContract(accounts.chainId, "DataStore")),
      abi: parseAbi(["function getUint(bytes32) view returns(uint256)"]),
      functionName: "getUint",
      args: [key as Hex],
    });
  const divisor = profile === "rebate" ? await uint(CLAIMABLE_COLLATERAL_TIME_DIVISOR_KEY) : 1n;
  const delay = profile === "rebate" ? await uint(CLAIMABLE_COLLATERAL_DELAY_KEY) : 0n;
  if (divisor <= 0n) throw new Error("LIVE_DATA_UNAVAILABLE: invalid rebate time divisor");
  const maturedBefore = (BigInt(Math.floor(Date.now() / 1000)) - delay - 3600n) / divisor;
  const query =
    profile === "account"
      ? `multichainSamechainFundingEvents(limit:20,orderBy:timestamp_DESC,where:{operation_eq:deposit,token_eq:"${address}"}) { account txHash timestamp }`
      : profile === "funding"
        ? `claimableFundingFeeInfos(limit:20,orderBy:id_ASC,where:{tokenAddresses_containsAny:["${address}"]}) { id amounts marketAddresses tokenAddresses }`
        : `claimableCollaterals(limit:20,orderBy:value_DESC,where:{claimed_eq:false,tokenAddress_eq:"${address}",reductionFactor_eq:"0",timeKey_lt:${maturedBefore}}) { account marketAddress tokenAddress value timeKey factor factorByTime reductionFactor }`;
  const discoveredAt = new Date().toISOString();
  const data = await accounts.query<{
    squidStatus: { height: number };
    multichainSamechainFundingEvents?: { account: string; txHash: string; timestamp: number }[];
    claimableFundingFeeInfos?: Funding[];
    claimableCollaterals?: Rebate[];
  }>(`{ squidStatus { height } ${query} }`);
  const rows =
    profile === "account"
      ? data.multichainSamechainFundingEvents!
      : profile === "funding"
        ? data.claimableFundingFeeInfos!
        : data.claimableCollaterals!;
  const markets = profile === "account" ? [] : await fetchApiMarketsInfo(accounts);
  let checked = 0;
  for (const row of rows.slice(0, 12)) {
    checked++;
    const account = getAddress("account" in row ? row.account : row.id.split(":").at(-1)!);
    const code = await accounts.rpc.getCode({ address: account });
    if (code && code !== "0x") continue;
    const evidence: FinancialEvidence = { amount: 0n, token: address, decimals: token.decimals, symbol: token.symbol };
    if (profile === "account") evidence.amount = await uint(multichainBalanceKey(account, address));
    if (profile === "funding") {
      const item = row as Funding;
      for (let i = 0; i < item.tokenAddresses.length; i++) {
        if (getAddress(item.tokenAddresses[i]) !== address) continue;
        const market = markets.find(
          (m) => getAddress(m.marketTokenAddress) === getAddress(item.marketAddresses[i]) && !m.isDisabled
        );
        if (!market) continue;
        const amount = await uint(claimableFundingAmountKey(market.marketTokenAddress, address, account));
        if (amount < 10n ** BigInt(token.decimals - 1)) continue;
        evidence.amount = amount;
        evidence.marketAddress = getAddress(market.marketTokenAddress);
        evidence.marketName = market.name;
        break;
      }
    }
    if (profile === "rebate") {
      const item = row as Rebate;
      const market = markets.find(
        (m) => getAddress(m.marketTokenAddress) === getAddress(item.marketAddress) && !m.isDisabled
      );
      if (!market) continue;
      const response = await accounts.query<{ claimableCollaterals: Rebate[] }>(
        "query($account:String!,$market:String!,$token:String!) { claimableCollaterals(limit:100,where:{account_eq:$account,marketAddress_eq:$market,tokenAddress_eq:$token,claimed_eq:false}) { account marketAddress tokenAddress value timeKey factor factorByTime reductionFactor } }",
        { account, market: item.marketAddress, token: address }
      );
      if (response.claimableCollaterals.length === 100) continue;
      for (const rebate of response.claimableCollaterals) {
        const precision = 10n ** 30n;
        let factor =
          BigInt(rebate.factor) > BigInt(rebate.factorByTime) ? BigInt(rebate.factor) : BigInt(rebate.factorByTime);
        const reduction = BigInt(rebate.reductionFactor);
        if (reduction >= precision) continue;
        if (!factor && !reduction && BigInt(Math.floor(Date.now() / 1000)) - BigInt(rebate.timeKey) * divisor > delay)
          factor = precision;
        if (factor > reduction) evidence.amount += (BigInt(rebate.value) * (factor - reduction)) / precision;
      }
      evidence.marketAddress = getAddress(market.marketTokenAddress);
      evidence.marketName = market.name;
    }
    if (evidence.amount < 10n ** BigInt(token.decimals - 1)) continue;
    return {
      account,
      profile,
      financial: evidence,
      token: address,
      transactionHash: "txHash" in row ? row.txHash : undefined,
      timestamp: "timestamp" in row ? row.timestamp : undefined,
      discoveredAt,
      checkedAt: new Date().toISOString(),
      endpoint: accounts.endpoint,
      indexerHeight: data.squidStatus.height,
      candidateNumber: checked,
    };
  }
  throw new Error(
    `LIVE_DATA_UNAVAILABLE: no current ${profile} state among ${checked} candidates on ${accounts.chainId}`
  );
}
