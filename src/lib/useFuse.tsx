import Fuse from "fuse.js";
import isEqual from "lodash/isEqual";
import React, { useRef } from "react";

import { EMPTY_ARRAY, EMPTY_OBJECT } from "lib/objects";

export function useFuse<T extends { id: string | number }>(
  collectionGetter: () => T[],
  keyOptions: Partial<
    Record<
      keyof T,
      {
        weight: number;
      }
    >
  >,
  dependencies: React.DependencyList | undefined
): Fuse<T>;

export function useFuse<T extends { id: any }>(
  collectionGetter: () => T[],
  dependencies: React.DependencyList | undefined
): Fuse<T>;

export function useFuse<T extends { id: string | number }>(collectionGetter: () => T[], ...rest: any): Fuse<T> {
  let keyOptions: Partial<
    Record<
      keyof T,
      {
        weight: number;
      }
    >
  > = EMPTY_OBJECT;
  let dependencies: React.DependencyList = EMPTY_ARRAY;

  if (rest.length === 1) {
    dependencies = rest[0] || EMPTY_ARRAY;
  } else if (rest.length === 2) {
    keyOptions = rest[0];
    dependencies = rest[1] || EMPTY_ARRAY;
  }

  const prevDeps = useRef(dependencies);
  const cache = useRef<Fuse<T> | null>(null);

  if (isEqual(prevDeps.current, dependencies) && cache.current) {
    prevDeps.current = dependencies;
    return cache.current;
  }

  prevDeps.current = dependencies;

  const collection = collectionGetter();

  const keys = Object.keys(collection[0] || EMPTY_OBJECT).filter((key) => key !== "id" && !("id" in keyOptions));

  const searcher = new Fuse<T>(collection, {
    keys,
    threshold: 0.5,
  });

  cache.current = searcher;

  return searcher;
}
