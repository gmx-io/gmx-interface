import fetch from "cross-fetch";

export type GraphqlFetcherOptions = {
  strict?: boolean;
};

type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export default async function graphqlFetcher<T>(
  endpoint: string,
  query: string,
  variables?: object,
  options?: GraphqlFetcherOptions
): Promise<T | undefined> {
  try {
    const response = await fetch(endpoint, {
      body: JSON.stringify({ query, variables }),
      headers: { "Content-type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const { data, errors } = (await response.json()) as GraphqlResponse<T>;

    if (options?.strict && errors?.length) {
      throw new Error(`GraphQL error: ${errors[0].message}`);
    }

    if (options?.strict && data === undefined) {
      throw new Error("GraphQL response is missing data");
    }

    return data;
  } catch (error) {
    throw new Error(`Error fetching GraphQL query: ${error}`);
  }
}
