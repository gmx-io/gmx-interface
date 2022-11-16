import { useEffect, useState } from "react";
import { useWeb3React } from "@web3-react/core";

export default function useIsAddressAContract() {
  const { active, account, library } = useWeb3React();
  const [isContract, setIsContract] = useState(false);

  useEffect(() => {
    if (!active) return;
    (async function () {
      const code = await library.getCode(account);
      setIsContract(code !== "0x");
    })();
  }, [account, library, active]);

  return isContract;
}
