import React from "react";

type InternalLink = { to: string | { pathname: string }; onClick?: (e: React.MouseEvent) => void };

interface TrackingLinkProps<TChildren extends InternalLink | HTMLAnchorElement> {
  onClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement, MouseEvent>) => Promise<void> | void;
  children: React.ReactElement<TChildren>;
}

export function TrackingLink<TChildren extends InternalLink | HTMLAnchorElement>({
  onClick,
  children,
}: TrackingLinkProps<TChildren>) {
  if (!children) {
    return null;
  }

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement, MouseEvent>) => {
    if (onClick) {
      e.preventDefault();

      try {
        await onClick(e);
      } catch (error) {
        // ignore
      }

      // Navigate after the onClick completes
      if ("href" in children.props) {
        window.location.href = children.props.href;
      } else if ("to" in children.props) {
        const to = children.props.to;
        window.location.href = typeof to === "string" ? to : to.pathname || "/";
      }
    } else if ("onClick" in children.props) {
      children.props.onClick?.(e);
    }
  };

  return React.cloneElement(children, {
    ...children.props,
    onClick: handleClick,
  } as TChildren);
}
