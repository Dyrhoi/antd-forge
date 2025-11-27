/**
 * Generic path and type utilities for navigating nested object structures.
 * These are not hook-specific and can be reused across the library.
 */

export type SimplePathSegment = string | number;

/**
 * Normalizes a name path to always be an array.
 * - `"foo"` → `["foo"]`
 * - `["foo", "bar"]` → `["foo", "bar"]`
 */
export type NormalizeNamePath<TName> = TName extends SimplePathSegment[]
  ? TName
  : TName extends SimplePathSegment
    ? [TName]
    : never;

/**
 * Navigate to a nested type given a path.
 * @example
 * type User = { profile: { name: string } };
 * type Name = GetTypeAtPath<User, ["profile", "name"]>; // string
 */
export type GetTypeAtPath<
  T,
  Path extends readonly SimplePathSegment[],
> = Path extends [infer First, ...infer Rest extends SimplePathSegment[]]
  ? First extends keyof T
    ? GetTypeAtPath<T[First], Rest>
    : T extends readonly (infer Item)[]
      ? First extends number
        ? GetTypeAtPath<Item, Rest>
        : never
      : never
  : T;

/**
 * Get the array item type at the given path.
 * @example
 * type Form = { users: { name: string }[] };
 * type User = GetArrayItemType<Form, "users">; // { name: string }
 */
export type GetArrayItemType<T, TName> =
  GetTypeAtPath<T, NormalizeNamePath<TName>> extends readonly (infer Item)[]
    ? Item
    : never;

/**
 * Build all valid paths for navigating within a type.
 * Used to generate autocomplete options for nested object properties.
 * @example
 * type User = { email: string; profile: { firstName: string } };
 * type Paths = InnerPaths<User>; // ["email"] | ["profile"] | ["profile", "firstName"]
 */
export type InnerPaths<
  T,
  Prefix extends SimplePathSegment[] = [],
> = T extends object
  ? T extends readonly unknown[]
    ? never // Don't recurse into nested arrays for now
    : {
        [K in keyof T & (string | number)]:
          | [...Prefix, K]
          | InnerPaths<T[K], [...Prefix, K]>;
      }[keyof T & (string | number)]
  : never;
