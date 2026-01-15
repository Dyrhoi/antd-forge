import type { NormalizeValueParams, SimplePathSegment } from "./path-types";

export function normalizePathSegment(segment: unknown): unknown {
  if (segment === null || segment === undefined) return segment;

  if (typeof segment === "object" && "key" in segment) {
    return (segment as { key: unknown }).key;
  }

  return segment;
}

export function arePathSegmentsEqual(a: unknown, b: unknown): boolean {
  return normalizePathSegment(a) === normalizePathSegment(b);
}

export function normalizePath(
  path: readonly unknown[] | null | undefined,
): unknown[] | undefined {
  return path?.map(normalizePathSegment);
}

/**
 * Normalizes an Ant Design name path-like input to an array.
 *
 * Antd accepts either a single segment or an array of segments.
 * Our codebase often needs the array form for concatenation/comparison.
 */
export function normalizeNamePath(
  name: unknown
): SimplePathSegment[] {
  if (name === null || name === undefined) return [];
  return (Array.isArray(name) ? name : [name]) as SimplePathSegment[];
}

export function arePathsEqual(
  a: readonly unknown[] | null | undefined,
  b: readonly unknown[] | null | undefined,
): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((segment, index) => arePathSegmentsEqual(segment, b[index]));
}

// ============================================================================
// Normalize Params Factory
// ============================================================================

/**
 * Creates a NormalizeValueParams object with a type-narrowing `match` method.
 *
 * @param name - The field name path
 * @param value - The current field value
 * @returns NormalizeValueParams with match type guard
 */
export function createNormalizeParams<T>(
  name: SimplePathSegment[],
  value: unknown,
): NormalizeValueParams<T> {
  return {
    name,
    value,
    match(path): boolean {
      const normalizedPath = normalizeNamePath(path);
      return arePathsEqual(name, normalizedPath);
    },
  } as NormalizeValueParams<T>;
}
