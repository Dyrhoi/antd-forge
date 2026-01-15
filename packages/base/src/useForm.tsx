import { StandardSchemaV1 } from "@standard-schema/spec";
import { useRef } from "react";
import {
  createFormHook,
  CreateFormHookReturn,
  UseCustomFormOptions,
  UseCustomFormReturn,
  ResolveFormValues,
} from "./createFormHook";

// ============================================================================
// Re-export types from createFormHook
// ============================================================================

export type {
  AutoSubmitMode,
  AutoSubmitConfig,
  AutoSubmitOption,
  UseCustomFormOptions,
  UseCustomFormReturn,
  ResolveFormValues,
} from "./createFormHook";

// ============================================================================
// useForm Types
// ============================================================================

/**
 * Return type for useForm (alias for UseCustomFormReturn).
 */
export type UseFormReturn<TParsedValues = unknown> =
  UseCustomFormReturn<TParsedValues>;

/**
 * Options for useForm hook.
 */
export interface UseFormOptions<
  TSchema extends StandardSchemaV1 | undefined,
  TFormValues,
> extends UseCustomFormOptions<TFormValues> {
  /**
   * A Standard Schema validator (e.g., Zod, Valibot, ArkType) for form validation.
   *
   * When provided:
   * - Form values are validated against this schema on submission
   * - Validation errors are automatically mapped to form field errors
   * - The `onFinish` callback receives the schema's parsed output type
   * - Required fields are automatically detected and marked
   *
   * @see https://github.com/standard-schema/standard-schema
   */
  validator?: TSchema;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * A typed form hook that provides schema validation and type-safe form components.
 *
 * @example
 * ```tsx
 * // With schema validation
 * const { Form, FormItem } = useForm({
 *   validator: userSchema,
 *   onFinish: (values) => console.log(values), // typed!
 * });
 *
 * // Without schema (manual typing)
 * const { Form, FormItem } = useForm<MyFormValues>({
 *   onFinish: (values) => console.log(values),
 * });
 * ```
 */
export function useForm<
  TFormValues = unknown,
  TSchema extends StandardSchemaV1 | undefined = undefined,
>(
  opts?: UseFormOptions<TSchema, ResolveFormValues<TSchema, TFormValues>>,
): UseFormReturn<ResolveFormValues<TSchema, TFormValues>> {
  type TResolvedValues = ResolveFormValues<TSchema, TFormValues>;

  const { validator, ...useCustomFormOptions } = opts ?? {};

  // Memoize the factory hooks by validator reference.
  // createFormHook creates components (FormItem, FormList, etc.) at factory level,
  // so we must NOT call it on every render to maintain stable component references.
  const factoryRef = useRef<CreateFormHookReturn<TResolvedValues> | null>(null);
  const validatorRef = useRef(validator);

  // Only recreate if validator reference changes
  if (factoryRef.current === null || validatorRef.current !== validator) {
    validatorRef.current = validator;
    factoryRef.current = createFormHook({
      validator,
    }) as CreateFormHookReturn<TResolvedValues>;
  }

  const { useCustomForm } = factoryRef.current;

  // Call the hook with remaining options
  return useCustomForm(
    useCustomFormOptions as UseCustomFormOptions<TResolvedValues>,
  );
}
