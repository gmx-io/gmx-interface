import { buildFiltersBody, GraphQlFilters } from "../buildFiltersBody";

describe("buildFiltersBody", () => {
  it("should return empty object if no filters", () => {
    const input: GraphQlFilters = {};

    const result = buildFiltersBody(input);

    expect(result).toEqual("{}");
  });

  it("should return correct filter string with single filter", () => {
    const input: GraphQlFilters = {
      foo: "bar",
    };

    const result = buildFiltersBody(input);

    expect(result).toEqual('{foo:"bar"}');
  });

  it("should return correct filter string with multiple filters", () => {
    const input: GraphQlFilters = {
      foo: "bar",
      baz: "qux",
    };

    const result = buildFiltersBody(input);

    expect(result).toEqual('{foo:"bar",baz:"qux"}');
  });

  it("should return correct filter string with nested filter", () => {
    const input: GraphQlFilters = {
      foo: {
        bar: {
          baz: "qux",
        },
      },
    };

    const result = buildFiltersBody(input);

    expect(result).toEqual('{foo_:{bar_:{baz:"qux"}}}');
  });

  it("should return correct filter string with or filter", () => {
    const input: GraphQlFilters = {
      or: [
        {
          foo: "bar",
        },
        {
          baz: "qux",
        },
      ],
    };

    const result = buildFiltersBody(input);

    expect(result).toEqual('{or:[{foo:"bar"},{baz:"qux"}]}');
  });

  it("should return correct filter string with and filter", () => {
    const input: GraphQlFilters = {
      and: [
        {
          foo: "bar",
        },
        {
          baz: "qux",
        },
      ],
    };

    const result = buildFiltersBody(input);

    expect(result).toEqual('{and:[{foo:"bar"},{baz:"qux"}]}');
  });

  it("should strip out undefined filters", () => {
    const input: GraphQlFilters = {
      foo: "bar",
      baz: undefined,
    };

    const result = buildFiltersBody(input);

    expect(result).toEqual('{foo:"bar"}');
  });

  it("should strip out empty or", () => {
    const input: GraphQlFilters = {
      or: [],
    };

    const result = buildFiltersBody(input);

    expect(result).toEqual("{}");
  });

  it("should strip out or with empty", () => {
    const input: GraphQlFilters = {
      or: [
        {},
        {
          foo: undefined,
        },
      ],
    };

    const result = buildFiltersBody(input);

    expect(result).toEqual("{}");
  });

  it("should throw error if or is mixed with other filters", () => {
    const input: GraphQlFilters = {
      or: [
        {
          foo: "bar",
        },
      ],
      // @ts-expect-error
      baz: "qux",
    };

    const getResult = () => buildFiltersBody(input);

    expect(getResult).toThrowError();
  });

  it("should throw error if and is mixed with other filters", () => {
    const input: GraphQlFilters = {
      and: [
        {
          foo: "bar",
        },
      ],
      // @ts-expect-error
      baz: "qux",
    };

    const getResult = () => buildFiltersBody(input);

    expect(getResult).toThrowError();
  });

  it("should throw not error if empty or is mixed with other filters", () => {
    const input: GraphQlFilters = {
      or: [],
      // @ts-expect-error
      baz: "qux",
    };

    const getResult = () => buildFiltersBody(input);

    expect(getResult).not.toThrowError();
  });

  it("should throw not error if empty and is mixed with other filters", () => {
    const input: GraphQlFilters = {
      and: [],
      // @ts-expect-error
      baz: "qux",
    };

    const getResult = () => buildFiltersBody(input);

    expect(getResult).not.toThrowError();
  });

  it("should format string values correctly", () => {
    const input: GraphQlFilters = {
      foo: "bar",
    };

    const result = buildFiltersBody(input);

    expect(result).toEqual('{foo:"bar"}');
  });

  it("should format number values correctly", () => {
    const input: GraphQlFilters = {
      foo: 123,
    };

    const result = buildFiltersBody(input);

    expect(result).toEqual("{foo:123}");
  });

  it("should format boolean values correctly", () => {
    const input: GraphQlFilters = {
      foo: true,
      bar: false,
    };

    const result = buildFiltersBody(input);

    expect(result).toEqual("{foo:true,bar:false}");
  });

  it("should format null values correctly", () => {
    const input: GraphQlFilters = {
      foo: null,
    };

    const result = buildFiltersBody(input);

    expect(result).toEqual("{foo:null}");
  });
});
