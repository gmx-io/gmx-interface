import React, { ReactNode } from "react";

interface ExchangeInfoProps {
  children?: ReactNode;
  divider?: ReactNode;
  className?: string;
}

interface ExchangeInfoGroupProps {
  children?: ReactNode;
}

const LINE_DIVIDER = <div className="line-divider" />;

function ExchangeInfo({ children, className, divider = LINE_DIVIDER }: ExchangeInfoProps) {
  const childrenArr = React.Children.toArray(children) as React.ReactElement[];

  return (
    <div className={className}>
      {childrenArr
        .reduce((acc, child, index) => {
          if (isExchangeInfoGroup(child)) {
            const groupChildren = React.Children.toArray(child.props.children).filter(Boolean) as React.ReactElement[];

            if (groupChildren.length) {
              acc.push(
                React.cloneElement(child, {
                  key: child.props.key ?? index,
                  children: groupChildren,
                })
              );
            }
          } else {
            acc.push(child);
          }

          return acc;
        }, [] as React.ReactElement[])
        .map((child, index, arr) => {
          const isLast = index === arr.length - 1;

          return (
            <>
              {child}
              {!isLast && divider}
            </>
          );
        })}
    </div>
  );
}

function ExchangeInfoGroup({ children }: ExchangeInfoGroupProps) {
  return <>{children}</>;
}

function isExchangeInfoGroup(child: ReactNode) {
  return React.isValidElement(child) && child.type === ExchangeInfoGroup;
}

ExchangeInfo.Group = ExchangeInfoGroup;

export { ExchangeInfo };
