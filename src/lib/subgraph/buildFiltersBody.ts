export type GraphQlFilters =
  | {
      or: GraphQlFilters[];
    }
  | {
      and: GraphQlFilters[];
    }
  | {
      /**
       * `or` must be a single key-value pair in the object.
       */
      or?: never;
      /**
       * `and` must be a single key-value pair in the object.
       */
      and?: never;
      /**
       * Key must not start with an `_`. If you want to use nested filtering add `_` to the parent key itself if possible.
       * Otherwise, if for some reason the field name itself starts with an `_`, change these types.
       */
      [key: `_${string}`]: never;
      [key: string]:
        | string
        | number
        | boolean
        | undefined
        | GraphQlFilters
        | string[]
        | number[]
        | GraphQlFilters[]
        | null;
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

  let hadOr = false;
  let hadAnd = false;

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
    } else if (value === null) {
      res[key] = null;
    } else {
      const valueStr = buildFiltersBody(value);
      if (valueStr !== "{}") {
        res[key + "_"] = buildFiltersBody(value);
      }
    }

    if (hadOr) {
      throw new Error("Or must be a single key-value pair in the object.");
    }

    if (key === "or" && res[key] !== undefined) {
      hadOr = true;
    }

    if (hadAnd) {
      throw new Error("And must be a single key-value pair in the object.");
    }

    if (key === "and" && res[key] !== undefined) {
      hadAnd = true;
    }
  }

  const str = Object.entries(res).reduce((previous, [key, value], index) => {
    const maybeComma = index === 0 ? "" : ",";
    return `${previous}${maybeComma}${key}:${value}`;
  }, "");

  return `{${str}}`;
}
