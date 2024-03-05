import { ApolloClient, InMemoryCache } from "@apollo/client";
import { getSubgraphUrl } from "config/subgraph";

export function createClient(chainId: number, subgraph: string) {
  const url = getSubgraphUrl(chainId, subgraph);
  return new ApolloClient({
    uri: url,
    cache: new InMemoryCache(),
  });
}

type GraphQlFilters =
  | {
      or: GraphQlFilters[];
    }
  | {
      and: GraphQlFilters[];
    }
  | {
      or?: never;
      and?: never;
      [key: `_${string}`]: never;
      [key: string]: string | number | boolean | undefined | GraphQlFilters | string[] | number[] | GraphQlFilters[];
    };

/**
 * Builds a body for the filters in the GraphQL query with respect to The Graph api.
 *
 * @example
 * <caption>Nested filters</caption>
 * buildFiltersBody({
 *     transaction: {
 *        timestamp_gte: 1234567890,
 *     }
 * });
 *
 *
 * @example
 * <caption>Logical operators</caption>
 * buildFiltersBody({
 *    or: [
 *       {
 *          foo: "bar",
 *       },
 *       {
 *          baz: "qux",
 *       },
 *      ],
 * });
 *
 * @returns a string encased in braces `{...}`
 */
export function buildFiltersBody(filters: GraphQlFilters): string {
  const res = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) {
      continue;
    }

    if (typeof value === "string") {
      res[key] = `"${value}"`;
    } else if (typeof value === "number") {
      res[key] = `${value}`;
    } else if (typeof value === "boolean") {
      res[key] = `${value}`;
    } else if (Array.isArray(value)) {
      const valueStr =
        "[" +
        value
          .map((el: string | number | GraphQlFilters) => {
            if (typeof el === "string") {
              return `"${el}"`;
            } else if (typeof el === "number") {
              return `${el}`;
            } else {
              const elemStr = buildFiltersBody(el);

              if (elemStr === "{}") {
                return "";
              } else {
                return elemStr;
              }
            }
          })
          .filter((el) => el !== "")
          .join(",") +
        "]";

      if (valueStr !== "[]") {
        res[key] = valueStr;
      }
    } else {
      const valueStr = buildFiltersBody(value);
      if (valueStr !== "{}") {
        res[key + "_"] = buildFiltersBody(value);
      }
    }
  }

  const str = Object.entries(res).reduce((previous, [key, value], index) => {
    const maybeComma = index === 0 ? "" : ",";
    return `${previous}${maybeComma}${key}:${value}`;
  }, "");

  return `{${str}}`;
}
