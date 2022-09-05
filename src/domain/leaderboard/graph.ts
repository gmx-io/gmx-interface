import { BigNumber } from "ethers";
import { useEffect, useState } from "react";

interface Stats {
  id: string
  label: string
  rank: number
  realizedPnl: string
}

export function useIndividualStats(chainId) {
  const [data, setData] = useState<Stats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function main() {
      setTimeout(() => {
        setData([{
          id: "0x6887246668a3b87f54deb3b94ba47a6f63f32985",
          rank: 1,
          label: "0x6887246668a3b87f54deb3b94ba47a6f63f32985",
          realizedPnl: BigNumber.from("100000000000000000000000000000000000").toString(),
        }]);

        setLoading(false)
      }, 1000);
    }

    main()
  })

  return { data, loading }
}

export function useTeamsStats(chainId) {
  const [data, setData] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function main() {
      setTimeout(() => {
        setData([
          {
            id: "0x0000",
            rank: 1,
            label: "Morazzela",
            realizedPnl: BigNumber.from("100000000000000000000000000000000000").toString(),
          },
        ]);

        setLoading(false)
      }, 1000);
    }

    main();
  }, [setData, chainId]);

  return { data, loading }
}
