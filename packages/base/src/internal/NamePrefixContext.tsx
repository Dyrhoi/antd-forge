import { createContext, ReactNode, useContext } from "react";

/**
 * Simple path segment - either a string key or numeric index.
 */
export type SimplePathSegment = string | number;

/**
 * Context value for tracking the current path prefix in the form tree.
 */
type NamePrefixContextValue = {
  prefix: SimplePathSegment[];
};

const NamePrefixContext = createContext<NamePrefixContextValue>({
  prefix: [],
});

/**
 * Hook to read the current path prefix from context.
 * @internal
 */
export function useNamePrefix(): NamePrefixContextValue {
  return useContext(NamePrefixContext);
}

/**
 * Provider component that sets a new prefix for all descendants.
 * @internal
 */
export function NamePrefixProvider({
  prefix,
  children,
}: {
  prefix: SimplePathSegment[];
  children: ReactNode;
}): ReactNode {
  return (
    <NamePrefixContext.Provider value={{ prefix }}>
      {children}
    </NamePrefixContext.Provider>
  );
}

/**
 * Builds a full path by prepending the prefix to the name path.
 * @internal
 */
export function buildFullPath(
  prefix: SimplePathSegment[],
  namePath: SimplePathSegment[],
): SimplePathSegment[] {
  if (prefix.length === 0) {
    return namePath;
  }
  return [...prefix, ...namePath];
}
