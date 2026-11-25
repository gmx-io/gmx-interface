/* eslint-disable no-console */
import { execFileSync } from "child_process";
import { beforeAll, describe, expect, it } from "vitest";

import { bigMath } from "sdk/utils/bigmath";
import type { MarketInfo } from "sdk/utils/markets/types";
import { expandDecimals, USD_DECIMALS } from "sdk/utils/numbers";

import { getRevertName, LIVE_STATE, loadParityContext, ParityContext, Scenario } from "./context";

export type ParityInput<Case> = { ctx: ParityContext; market: MarketInfo; testCase: Case };

type Value = bigint | boolean | undefined;

type KnownIssue = {
  reason: string;
  /** Only in this scenario, on live state and in every scenario by default */
  scenario?: Scenario;
};

type Field<Case> = {
  /** What a bigint difference is measured against, the contract value by default */
  bpsOf?: (input: ParityInput<Case>) => bigint;
  /** The bigint difference allowed, 0.001 bps by default */
  toleranceBps?: number | ((input: ParityInput<Case>) => number);
  /** Why the field differs from the contract: its tests expect a difference and fail once it is gone */
  knownIssues?: KnownIssue[];
};

type ParitySpec<Case extends { label: string }, Out extends Record<string, Value>> = {
  markets: (market: MarketInfo) => boolean;
  cases: (market: MarketInfo, ctx: ParityContext) => Case[] | Promise<Case[]>;
  ours: (input: ParityInput<Case>) => Out | Promise<Out>;
  contract: (input: ParityInput<Case>) => Promise<Out>;
  /** Two bigints compare by their difference in bps, anything else must be equal */
  fields: { [K in keyof Out]: Field<Case> };
  /**
   * Situations the chain state or a scenario must produce at least once. The cases only aim at them, so without this
   * a pair would pass silently when, say, no deposit on this block has positive impact or a scenario didn't apply
   */
  requiredCases?: { name: string; when: (input: ParityInput<Case>, ours: Out) => boolean }[];
  /** The pair runs on the live state and once more inside each scenario */
  scenarios?: Scenario[];
};

// The code a run measures, "-dirty" when it has uncommitted changes
const codeVersion = execFileSync("git", ["describe", "--always", "--dirty"], { encoding: "utf8" }).trim();

type Row = { state: string; market: string; case: string; field: string; diffBps: number; failure?: string };

const DEFAULT_TOLERANCE_BPS = 0.001;

export const usd = (value: number) => expandDecimals(value, USD_DECIMALS);

export function toBps(delta: bigint, base: bigint) {
  if (base === 0n) {
    return delta === 0n ? 0 : Infinity;
  }

  return Number((delta * 10n ** 8n) / bigMath.abs(base)) / 10_000;
}

const formatValue = (value: Value) => (value === undefined ? "none" : String(value));

const formatRow = (row: Row) => `${row.market} / ${row.case}: ${row.failure}`;

function compareField<Case>(field: Field<Case>, input: ParityInput<Case>, ours: Value, contract: Value) {
  if (typeof ours === "bigint" && typeof contract === "bigint") {
    const base = field.bpsOf ? field.bpsOf(input) : contract;
    const diffBps = toBps(ours - contract, base);
    const toleranceBps =
      typeof field.toleranceBps === "function"
        ? field.toleranceBps(input)
        : field.toleranceBps ?? DEFAULT_TOLERANCE_BPS;

    return Math.abs(diffBps) <= toleranceBps ? { diffBps } : { diffBps, failure: `${diffBps} bps` };
  }

  if (ours === contract) {
    return { diffBps: 0 };
  }

  return { diffBps: Infinity, failure: `we say ${formatValue(ours)}, the contract says ${formatValue(contract)}` };
}

async function compareCase<Case extends { label: string }, Out extends Record<string, Value>>(
  spec: ParitySpec<Case, Out>,
  input: ParityInput<Case>
): Promise<{ ours: Out; rows: Row[]; revert?: string }> {
  const row = { state: input.ctx.state, market: input.market.name, case: input.testCase.label };
  const fieldNames = Object.keys(spec.fields);
  const ours = await spec.ours(input);

  try {
    const contract = await spec.contract(input);
    const rows = fieldNames.map((field) => {
      const comparison = compareField(spec.fields[field], input, ours[field], contract[field]);

      return { ...row, field, ...comparison };
    });

    return { ours, rows };
  } catch (error) {
    const revert = getRevertName(error);

    if (revert === undefined) {
      throw error;
    }

    // no rows: a revert is never a known difference
    return { ours, rows: [], revert: `${row.state} / ${row.market} / ${row.case}: contract reverts with ${revert}` };
  }
}

async function loadInputs<Case extends { label: string }, Out extends Record<string, Value>>(
  spec: ParitySpec<Case, Out>,
  scenario: Scenario | undefined
) {
  const ctx = await loadParityContext(scenario);
  const markets = Object.values(ctx.marketsInfoData).filter(spec.markets);
  const inputsByMarket = await Promise.all(
    markets.map(async (market) => {
      const cases = await spec.cases(market, ctx);

      return cases.map((testCase) => ({ ctx, market, testCase }));
    })
  );

  return { ctx, markets, inputs: inputsByMarket.flat() };
}

const getKnownIssues = <Case>(field: Field<Case>, state: string) =>
  (field.knownIssues ?? []).filter((issue) => issue.scenario === undefined || issue.scenario.name === state);

async function runPair<Case extends { label: string }, Out extends Record<string, Value>>(
  name: string,
  spec: ParitySpec<Case, Out>,
  states: string[]
) {
  const runs = [];

  for (const scenario of [undefined, ...(spec.scenarios ?? [])]) {
    runs.push(await loadInputs(spec, scenario));
  }

  const inputs = runs.flatMap((run) => run.inputs);
  const results = await Promise.all(inputs.map((input) => compareCase(spec, input)));
  const rows = results.flatMap((result) => result.rows);
  const reverts = results.flatMap((result) => (result.revert ? [result.revert] : []));
  const requiredCases = (spec.requiredCases ?? []).map((requiredCase) => ({
    name: requiredCase.name,
    count: inputs.filter((input, i) => requiredCase.when(input, results[i].ours)).length,
  }));
  const casesByState = Object.fromEntries(runs.map((run) => [run.ctx.state, run.inputs.length]));

  runs.forEach(({ ctx, markets, inputs }) =>
    console.log(
      `${name}, ${ctx.state}: code ${codeVersion}, block ${ctx.blockNumber}, ${markets.length} markets, ${inputs.length} cases`
    )
  );
  states.forEach((state) =>
    Object.entries(spec.fields).forEach(([field, config]) => {
      const failures = rows.filter((row) => row.state === state && row.field === field && row.failure);
      const maxBps = Math.max(0, ...failures.map((row) => Math.abs(row.diffBps)));

      if (failures.length > 0) {
        console.log(
          `${state} / ${field}: ${failures.length} of ${casesByState[state]} cases differ, max ${maxBps} bps`
        );
      }

      getKnownIssues(config, state).forEach((issue) =>
        console.log(`${state} / ${field}: known issue: ${issue.reason}`)
      );
    })
  );
  reverts.forEach((revert) => console.log(revert));
  requiredCases.forEach((requiredCase) => console.log(`cases matching ${requiredCase.name}: ${requiredCase.count}`));
  console.table([...rows].sort((a, b) => Math.abs(b.diffBps) - Math.abs(a.diffBps)).slice(0, 20));

  return { rows, reverts, requiredCases, casesByState };
}

export function parity<Case extends { label: string }, Out extends Record<string, Value>>(
  name: string,
  spec: ParitySpec<Case, Out>
) {
  const states = [LIVE_STATE, ...(spec.scenarios ?? []).map((scenario) => scenario.name)];

  describe(name, () => {
    let result: Awaited<ReturnType<typeof runPair>>;

    // a load or RPC error fails the whole pair, so an expected failure below can only come from a difference
    beforeAll(async () => {
      result = await runPair(name, spec, states);
    });

    states.forEach((state) =>
      Object.entries(spec.fields).forEach(([field, config]) => {
        const getFailures = () =>
          result.rows.filter((row) => row.state === state && row.field === field && row.failure).map(formatRow);

        if (getKnownIssues(config, state).length > 0) {
          it.fails(`${state} / ${field} differs: known issues`, () => expect(getFailures()).toEqual([]));
        } else {
          it(`${state} / ${field} matches the contract`, () => expect(getFailures()).toEqual([]));
        }
      })
    );

    it("the contract reverts on no case", () => expect(result.reverts).toEqual([]));

    it("reaches every required case", () => {
      const emptyStates = states.filter((state) => !result.casesByState[state]).map((state) => `no cases: ${state}`);
      const missingCases = result.requiredCases
        .filter((requiredCase) => requiredCase.count === 0)
        .map((requiredCase) => `no case matches: ${requiredCase.name}`);

      expect([...emptyStates, ...missingCases]).toEqual([]);
    });
  });
}
