import { useEffect, useState } from "react";

export default function useIsMetamaskMobile(): boolean {
  const [isMetamaskMobile, setIsMetamaskMobile] = useState(false);
  useEffect(() => {
    if (window.ethereum) {
      handleEthereum();
    } else {
      window.addEventListener("ethereum#initialized", handleEthereum, {
        once: true,
      });
      setTimeout(handleEthereum, 3000);
    }

    function handleEthereum() {
      const { ethereum } = window;
      if (ethereum && ethereum.isMetaMask) {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          setIsMetamaskMobile(true);
        }
      } else {
        setIsMetamaskMobile(false);
      }
    }
  }, []);

  return isMetamaskMobile;
}
