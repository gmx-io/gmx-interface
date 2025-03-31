import { ReactNode } from "react";

export type BaseOptionValue = string | number;

export type RegularOption<V extends BaseOptionValue> = {
  label?: string | ReactNode;
  className?: {
    active?: string;
    regular?: string;
  };
  icon?: ReactNode;
  value: V;
};

export type NestedOption<V extends BaseOptionValue> = {
  label: string | ReactNode;
  options: RegularOption<V>[];
};

export type Option<V extends BaseOptionValue> = RegularOption<V> | NestedOption<V>;

export function isNestedOption<V extends string | number>(option: Option<V>): option is NestedOption<V> {
  return "options" in option;
}
