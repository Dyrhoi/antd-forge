import type { NormalizeValueParams } from "./internal/path-types";


/**
 * Recursively cleans empty values from a value.
 * - Primitives: returns undefined if empty, otherwise the value
 * - Arrays: filters out empty values, returns undefined if result is empty
 * - Objects: removes empty properties, returns undefined if result is empty
 */
export function cleanEmptyValues<T>(value: T): T | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value === "" ? undefined : value;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? undefined : value;
  }

  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => cleanEmptyValues(item))
      .filter((item) => item !== undefined);
    return cleaned.length === 0 ? undefined : (cleaned as T);
  }

  if (typeof value === "object" && value !== null) {
    const cleaned: Record<string, unknown> = {};
    let hasValues = false;

    for (const [key, val] of Object.entries(value)) {
      const cleanedVal = cleanEmptyValues(val);
      if (cleanedVal !== undefined) {
        cleaned[key] = cleanedVal;
        hasValues = true;
      }
    }

    return hasValues ? (cleaned as T) : undefined;
  }

  return value;
}

/**
 * Default normalize function that converts empty values to undefined.
 * Handles: empty strings, null, NaN, empty arrays, arrays with only empty values,
 * and objects with only empty properties.
 *
 * Use this with `normalizeValue` for common form behavior where empty inputs
 * should be treated as "no value".
 *
 * @example
 * ```tsx
 * useForm({
 *   normalizeValue: defaultEmptyValuesToUndefined,
 * })
 * ```
 *
 * @example Values that become undefined:
 * - `""` → `undefined`
 * - `null` → `undefined`
 * - `NaN` → `undefined`
 * - `[]` → `undefined`
 * - `[null, undefined, ""]` → `undefined`
 * - `{ a: null, b: "" }` → `undefined`
 * - `{ a: { b: null } }` → `undefined`
 *
 * @example Values that are cleaned recursively:
 * - `["a", "", "b"]` → `["a", "b"]`
 * - `{ a: "x", b: null }` → `{ a: "x" }`
 * - `{ a: ["", "x"], b: null }` → `{ a: ["x"] }`
 */
export function defaultEmptyValuesToUndefined<T>(
  params: NormalizeValueParams<T>,
): unknown {
  return cleanEmptyValues(params.value);
}
