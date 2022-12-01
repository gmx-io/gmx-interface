import Checkbox from "components/Checkbox/Checkbox";

type Props = {
  spenderAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
};

export function ApproveTokenButton(p: Props) {
  // const { chainId } = useChainId();

  return (
    <Checkbox
      isChecked={false}
      setIsChecked={function (checked: boolean): void {
        throw new Error("Function not implemented.");
      }}
    >
      Approve token {p.tokenSymbol}
    </Checkbox>
  );
}
