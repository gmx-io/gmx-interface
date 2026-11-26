/* eslint-disable no-console */
import { execFileSync } from "child_process";
import { beforeAll, describe, expect, it } from "vitest";

import { bigMath } from "sdk/utils/bigmath";
import type { MarketInfo } from "sdk/utils/markets/types";
import { expandDecimals, USD_DECIMALS } from "sdk/utils/numbers";

import { getRevertName, LIVE_STATE, loadParityContext, ParityContext, Scenario } from "./context";

export type ParityInput<Case> = { ctx: ParityContext; market: MarketInfo; testCase: Case };

type Value = bigint | boolean | undefined;

type KnownIssue<Case, Out> = {
  reason: string;
  /** Only in this scenario, on live state and in every scenario by default */
  scenario?: Scenario;
  /**
   * The differing cases this issue explains. A case that differs and matches no issue fails the field, and an issue that
   * matches no differing case in any state fails as fixed. Without it the issue explains every case, and the field is
   * not checked in its states
   */
  appliesTo?: (input: ParityInput<Case>, app: Out, contract: Out) => boolean;
  /** A rounding difference a run may not reach: it explains cases, but need not explain one */
  occasional?: boolean;
};

type Field<Case, Out> = {
  /** What a bigint difference is measured against, the contract value by default */
  bpsOf?: (input: ParityInput<Case>) => bigint;
  /** The bigint difference allowed, 0.001 bps by default */
  toleranceBps?: number | ((input: ParityInput<Case>) => number);
  /** Why the field differs from the contract */
  knownIssues?: KnownIssue<Case, Out>[];
};

type ParitySpec<Case extends { label: string }, Out extends Record<string, Value>> = {
  markets: (market: MarketInfo) => boolean;
  cases: (market: MarketInfo, ctx: ParityContext) => Case[] | Promise<Case[]>;
  app: (input: ParityInput<Case>) => Out | Promise<Out>;
  contract: (input: ParityInput<Case>) => Promise<Out>;
  /** Two bigints compare by their difference in bps, anything else must be equal */
  fields: { [K in keyof Out]: Field<Case, Out> };
  /**
   * Situations the chain state or a scenario must produce at least once. The cases only aim at them, so without this
   * a pair would pass silently when, say, no deposit on this block has positive impact or a scenario didn't apply
   */
  requiredCases?: {
    name: string;
    when: (input: ParityInput<Case>, app: Out) => boolean;
    /** Only cases in this scenario count, so live rows cannot stand in for a scenario that did not apply */
    scenario?: Scenario;
  }[];
  /** The pair runs on the live state and once more inside each scenario */
  scenarios?: Scenario[];
};

// The code a run measures, "-dirty" when it has uncommitted changes
const codeVersion = execFileSync("git", ["describe", "--always", "--dirty"], { encoding: "utf8" }).trim();

const getKnownIssues = <Case, Out>(field: Field<Case, Out>, state: string) =>
  (field.knownIssues ?? []).filter((issue) => issue.scenario === undefined || issue.scenario.name === state);

type Row = {
  state: string;
  market: string;
  case: string;
  field: string;
  diffBps: number;
  failure?: string;
  /** The reasons of the known issues that explain the failure */
  knownIssues?: string[];
};

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

function compareField<Case, Out>(field: Field<Case, Out>, input: ParityInput<Case>, app: Value, contract: Value) {
  if (typeof app === "bigint" && typeof contract === "bigint") {
    const base = field.bpsOf ? field.bpsOf(input) : contract;
    const diffBps = toBps(app - contract, base);
    const toleranceBps =
      typeof field.toleranceBps === "function"
        ? field.toleranceBps(input)
        : field.toleranceBps ?? DEFAULT_TOLERANCE_BPS;

    return Math.abs(diffBps) <= toleranceBps ? { diffBps } : { diffBps, failure: `${diffBps} bps` };
  }

  if (app === contract) {
    return { diffBps: 0 };
  }

  return { diffBps: Infinity, failure: `the app says ${formatValue(app)}, the contract says ${formatValue(contract)}` };
}

async function compareCase<Case extends { label: string }, Out extends Record<string, Value>>(
  spec: ParitySpec<Case, Out>,
  input: ParityInput<Case>
): Promise<{ app: Out; rows: Row[]; revert?: string }> {
  const row = { state: input.ctx.state, market: input.market.name, case: input.testCase.label };
  const fieldNames = Object.keys(spec.fields);
  const app = await spec.app(input);

  try {
    const contract = await spec.contract(input);
    const rows = fieldNames.map((field) => {
      const config = spec.fields[field];
      const comparison = compareField(config, input, app[field], contract[field]);
      const knownIssues = comparison.failure
        ? getKnownIssues(config, input.ctx.state)
            .filter((issue) => issue.appliesTo?.(input, app, contract) ?? true)
            .map((issue) => issue.reason)
        : undefined;

      return { ...row, field, ...comparison, knownIssues };
    });

    return { app, rows };
  } catch (error) {
    const revert = getRevertName(error);

    if (revert === undefined) {
      throw error;
    }

    // no rows: a revert is never a known difference
    return { app, rows: [], revert: `${row.state} / ${row.market} / ${row.case}: contract reverts with ${revert}` };
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
    count: inputs.filter(
      (input, i) =>
        (requiredCase.scenario === undefined || input.ctx.state === requiredCase.scenario.name) &&
        requiredCase.when(input, results[i].app)
    ).length,
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

      getKnownIssues(config, state).forEach((issue) => {
        const count = failures.filter((row) => row.knownIssues?.includes(issue.reason)).length;

        console.log(`${state} / ${field}: known issue in ${count} cases: ${issue.reason}`);
      });
    })
  );
  reverts.forEach((revert) => console.log(revert));
  requiredCases.forEach((requiredCase) => console.log(`cases matching ${requiredCase.name}: ${requiredCase.count}`));
  console.table(
    [...rows]
      .sort((a, b) => Math.abs(b.diffBps) - Math.abs(a.diffBps))
      .slice(0, 20)
      .map(({ knownIssues, ...row }) => ({ ...row, knownIssues: knownIssues?.length }))
  );

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
        const knownIssues = getKnownIssues(config, state);
        const getFailures = () =>
          result.rows.filter((row) => row.state === state && row.field === field && row.failure);

        if (knownIssues.length === 0) {
          it(`${state} / ${field} matches the contract`, () => expect(getFailures().map(formatRow)).toEqual([]));
        } else if (knownIssues.some((issue) => !issue.appliesTo)) {
          it.fails(`${state} / ${field} differs: known issues, not checked`, () =>
            expect(getFailures().map(formatRow)).toEqual([])
          );
        } else {
          it(`${state} / ${field} matches the contract apart from its known issues`, () => {
            const unexplained = getFailures().filter((row) => row.knownIssues!.length === 0);

            expect(unexplained.map(formatRow)).toEqual([]);
          });
        }
      })
    );

    // in any state: a scenario may be there to keep an issue out
    Object.entries(spec.fields).forEach(([field, config]) =>
      (config.knownIssues ?? [])
        .filter((issue) => issue.appliesTo && !issue.occasional)
        .forEach((issue) =>
          it(`${field} still has the known issue: ${issue.reason}`, () => {
            const explained = result.rows.filter(
              (row) => row.field === field && row.knownIssues?.includes(issue.reason)
            );

            expect(explained.length).toBeGreaterThan(0);
          })
        )
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
