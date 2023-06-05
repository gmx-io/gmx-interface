export default async function graphqlFetcher<T>(
  endpoint: string,
  query: string,
  variables?: object
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

    const { data } = await response.json();
    return data;
  } catch (error) {
    throw new Error(`Error fetching GraphQL query: ${error}`);
  }
}
