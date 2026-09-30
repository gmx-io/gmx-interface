import React from "react";

type TrackingLinkChild = {
  to?: string | { pathname: string };
  href?: string;
  newTab?: boolean;
  onClick?: (e: React.MouseEvent) => void;
};

interface TrackingLinkProps<TChildren extends TrackingLinkChild> {
  onClick?: (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement, MouseEvent>) => Promise<void> | void;
  children: React.ReactElement<TChildren>;
}

export function TrackingLink<TChildren extends TrackingLinkChild>({ onClick, children }: TrackingLinkProps<TChildren>) {
  if (!children) {
    return null;
  }

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement, MouseEvent>) => {
    if (!onClick) {
      children.props.onClick?.(e);
      return;
    }

    const opensInNewTab = Boolean(children.props.newTab);

    if (!opensInNewTab) {
      e.preventDefault();
    }

    try {
      await onClick(e);
    } catch (error) {
      // ignore
    }

    if (opensInNewTab) {
      return;
    }

    // Navigate after the onClick completes
    if (children.props.href) {
      window.location.href = children.props.href;
    } else if (children.props.to) {
      const to = children.props.to;
      window.location.href = typeof to === "string" ? to : to.pathname || "/";
    }
  };

  return React.cloneElement(children, {
    ...children.props,
    onClick: handleClick,
  } as TChildren);
}
