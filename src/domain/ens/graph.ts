import { ApolloClient, gql, InMemoryCache } from "@apollo/client";

export async function getAdressesDomains(addresses: string[]) {
  const query = gql`
    query ($addresses: [String!]!) {
      domains(first: 1000, where: { owner_in: $addresses, name_not: null }) {
        name
        owner {
          id
        }
      }
    }
  `;

  const { data } = await getGraphClient().query({ query, variables: { addresses } });

  const result = {};
  for (const domain of data.domains) {
    result[domain.owner.id] = domain.name;
  }

  return result;
}

function getGraphClient() {
  return new ApolloClient({
    uri: "https://api.thegraph.com/subgraphs/name/ensdomains/ens",
    cache: new InMemoryCache(),
  });
}
