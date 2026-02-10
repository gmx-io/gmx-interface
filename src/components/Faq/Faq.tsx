import { ReactNode, useCallback, useState } from "react";

import { ExpandableRow } from "components/ExpandableRow";

export type FaqItem = {
  title: ReactNode;
  content: ReactNode;
};

type Props = {
  items: FaqItem[];
  title: ReactNode;
};

export function Faq({ items, title }: Props) {
  const [openIndex, setOpenIndex] = useState<number | undefined>(undefined);

  const handleToggle = useCallback(
    (index: number) => (open: boolean) => {
      setOpenIndex(open ? index : undefined);
    },
    []
  );

  return (
    <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-20">
      <div className="text-body-large font-medium text-typography-primary">{title}</div>
      <div className="flex flex-col">
        {items.map((item: FaqItem, index: number) => (
          <ExpandableRow
            key={index}
            open={openIndex === index}
            onToggle={handleToggle(index)}
            title={item.title}
            contentClassName="text-body-medium text-typography-primary"
            handleClassName="text-body-medium pt-16 text-left font-medium"
            className="border-b-1/2 border-slate-600 pb-16 last:border-b-0 last:pb-0"
            chevronClassName="mr-8 mt-12"
          >
            {item.content}
          </ExpandableRow>
        ))}
      </div>
    </div>
  );
}
