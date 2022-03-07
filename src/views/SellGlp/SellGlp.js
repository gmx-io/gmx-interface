import { useEffect } from "react";

export default function SellGlp(props) {
  useEffect(() => {
    window.location.href = "/buy_glp#redeem";
  }, []);
  return <div className="Page page-layout"></div>;
}
