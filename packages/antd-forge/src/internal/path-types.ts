/**
 * Recursively makes all properties of a type optional, including nested objects and arrays.
 */
export type DeepPartial<T> = T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
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
 * Build all valid paths for navigating within a type (tuple form only).
 * Used to generate autocomplete options for nested object properties.
 * Supports array traversal with `number` type for indices.
 * @example
 * type User = { email: string; profile: { firstName: string } };
 * type Paths = InnerPathsTuple<User>; // ["email"] | ["profile"] | ["profile", "firstName"]
 * 
 * type Form = { users: { name: string }[] };
 * type FormPaths = InnerPathsTuple<Form>; // ["users"] | ["users", number] | ["users", number, "name"]
 */
export type InnerPathsTuple<
  T,
  Prefix extends SimplePathSegment[] = [],
> = T extends object
  ? T extends readonly (infer Item)[]
    ? // For arrays: allow path to array itself, path to item (with number index), or traverse into items
      | [...Prefix]
      | [...Prefix, number]
      | InnerPathsTuple<Item, [...Prefix, number]>
    : {
        [K in keyof T & (string | number)]:
          | [...Prefix, K]
          | InnerPathsTuple<T[K], [...Prefix, K]>;
      }[keyof T & (string | number)]
  : never;

/**
 * Unwrap single-element tuples to their scalar form.
 * Allows antd-style name paths: "field" | ["field"] | ["nested", "field"]
 * @example
 * type Unwrapped = UnwrapSinglePath<["name"]>; // "name"
 * type Unchanged = UnwrapSinglePath<["profile", "name"]>; // ["profile", "name"]
 */
type UnwrapSinglePath<T> = T extends [infer Single extends SimplePathSegment]
  ? Single | T
  : T;

/**
 * Build all valid paths for navigating within a type.
 * Matches antd behavior by accepting both scalar and array forms for single-segment paths.
 * @example
 * type User = { email: string; profile: { firstName: string } };
 * type Paths = InnerPaths<User>; // "email" | ["email"] | "profile" | ["profile"] | ["profile", "firstName"]
 * 
 * type Form = { users: { name: string }[] };
 * type FormPaths = InnerPaths<Form>; // "users" | ["users"] | ["users", number] | ["users", number, "name"]
 */
export type InnerPaths<T> = UnwrapSinglePath<InnerPathsTuple<T>>;

  
/**
 * Recursively infers the type at a given name path tuple in T.
 * @template T - The root type.
 * @template P - The tuple path to navigate.
 * @returns The type at the given path, or never if invalid.
 *
 * @example
 * type Input = { user: { username: string } };
 * type Value1 = NamePathValue<Input, ["user"]>; // { username: string }
 * type Value2 = NamePathValue<Input, ["user", "username"]>; // string
 */
export type NamePathValue<T, P extends readonly (string | number | symbol)[]> =
  P extends [infer K, ...infer Rest]
    ? K extends keyof T
      ? Rest extends []
        ? T[K]
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for TypeScript type inference
          NamePathValue<T[K], Extract<Rest, any[]>>
      : never
    : T;

// ============================================================================
// Normalize Value Types
// ============================================================================

/**
 * Parameters passed to the normalizeValue callback.
 * Includes a `match` method that acts as a type guard to narrow the value type.
 *
 * @example
 * ```tsx
 * normalizeValue: (params) => {
 *   if (params.match(["username"])) {
 *     return params.value.trim(); // value is narrowed to string
 *   }
 *   return params.value;
 * }
 * ```
 */
export type NormalizeValueParams<T> = {
  /** The field name path being normalized (one of the valid paths in the schema) */
  name: InnerPathsTuple<T>;
  /** The current field value (unknown until narrowed via match) */
  value: unknown;
  /**
   * Type guard that narrows the value type based on the field path.
   * Returns true if the current field matches the given path.
   *
   * @param path - The field path to match against
   * @returns Type predicate that narrows `value` to the type at that path
   */
  match<P extends InnerPaths<T>>(
    path: P,
  ): this is {
    name: NormalizeNamePath<P>;
    value: GetTypeAtPath<T, NormalizeNamePath<P>>;
    match: NormalizeValueParams<T>["match"];
  };
};

/**
 * Normalize value callback function type.
 */
export type NormalizeValueFn<T> = (params: NormalizeValueParams<T>) => unknown;