import { StandardSchemaV1 } from "@standard-schema/spec";
import { Form, FormInstance, FormProps } from "antd";
import { useMemo, useState } from "react";
import { useForm as useFormSF } from "sunflower-antd";
import { createFormItem, TypedFormItemComponent } from "./FormItem";
import { createFormList, TypedFormListComponent } from "./FormList";
import { FieldData } from "./internal/antd-types";
import { standardValidate } from "./internal/standardSchemaValidator";
import { useDebounceCallback } from "./internal/useDebounceCallback";
import { warning } from "./internal/warning";

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Resolves the form values type based on explicit type or schema inference.
 * - If an explicit type is provided (not `unknown`), use it
 * - Otherwise, if a schema is provided, infer from the schema
 * - Fallback to `unknown`
 */
export type ResolveFormValues<TSchema, TExplicit> = unknown extends TExplicit
  ? TSchema extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<TSchema>
    : unknown
  : TExplicit;

// ============================================================================
// Public Types
// ============================================================================

/**
 * Auto-submit mode for the form.
 * - `'off'` (default): No automatic submission. Form submits only on explicit submit action.
 * - `'auto'`: Automatically submits using leading + trailing debounce (instant on first change, debounced for rapid changes).
 */
export type AutoSubmitMode = "off" | "auto";

/**
 * Configuration for auto-submit behavior.
 */
export interface AutoSubmitConfig {
  /**
   * The auto-submit mode.
   * @default 'off'
   */
  mode: AutoSubmitMode;

  /**
   * Debounce delay in milliseconds.
   * Only applicable when mode is 'auto'.
   * @default 300
   */
  debounce?: number;
}

/**
 * Auto-submit option can be a mode string or a full config object.
 */
export type AutoSubmitOption = AutoSubmitMode | AutoSubmitConfig;

export interface UseFormReturn<TParsedValues = unknown> {
  /**
   * Ant Design form instance with typed values.
   * Use this to programmatically interact with the form
   * (e.g., `form.setFieldsValue()`, `form.validateFields()`, `form.resetFields()`).
   */
  form: FormInstance<TParsedValues>;

  /**
   * Props to spread onto the Ant Design `<Form>` component.
   * Includes the configured `onFinish` handler with schema validation integration.
   *
   * @example
   * ```tsx
   * <Form {...formProps}>
   *   {/* form fields *\/}
   * </Form>
   * ```
   */
  formProps: FormProps<TParsedValues>;

  /**
   * A typed `Form.Item` component bound to the form's value type.
   * Provides autocomplete for the `name` prop and automatically integrates
   * schema validation rules when a validator is provided.
   */
  FormItem: TypedFormItemComponent<TParsedValues>;

  /**
   * A typed `Form.List` component bound to the form's value type.
   * Provides type-safe field operations for dynamic form arrays
   * with a `getName` helper for constructing nested field paths.
   */
  FormList: TypedFormListComponent<TParsedValues>;
}

export interface UseFormOptions<
  TSchema extends StandardSchemaV1 | undefined,
  TFormValues,
> {
  /**
   * Callback invoked when the form is successfully submitted.
   * If a `validator` is provided, this is called only after validation passes,
   * and receives the parsed/transformed output values from the schema.
   *
   * @param values - The validated form values (inferred from schema or explicit type).
   */
  onFinish?: (values: NoInfer<TFormValues>) => Promise<void> | void;

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

  /**
   * Configure automatic form submission behavior.
   *
   * Can be a mode string or a configuration object:
   * - `'off'` (default): No automatic submission
   * - `'auto'`: Submit automatically using leading + trailing debounce
   *   - Leading edge: Fires immediately on first change (instant for Select, Radio, etc.)
   *   - Trailing edge: Fires after debounce if values changed (for rapid typing)
   *
   * Or as a config object:
   * ```ts
   * { mode: 'auto', debounce: 500 }
   * ```
   *
   * @default 'off'
   *
   * @example
   * ```tsx
   * // Simple mode
   * useForm({ autoSubmit: 'auto', onFinish: handleSearch });
   *
   * // With custom debounce
   * useForm({
   *   autoSubmit: { mode: 'auto', debounce: 500 },
   *   onFinish: handleSearch
   * });
   * ```
   */
  autoSubmit?: AutoSubmitOption;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DEBOUNCE_MS = 300;

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Normalizes the autoSubmit option into a consistent config object.
 */
function normalizeAutoSubmitConfig(
  option: AutoSubmitOption | undefined,
): AutoSubmitConfig {
  if (!option || option === "off") {
    return { mode: "off" };
  }
  if (typeof option === "string") {
    return { mode: option };
  }
  return option;
}

// ============================================================================
// Implementation
// ============================================================================

export function useForm<
  TFormValues = unknown,
  TSchema extends StandardSchemaV1 | undefined = undefined,
>(
  opts?: UseFormOptions<TSchema, ResolveFormValues<TSchema, TFormValues>>,
): UseFormReturn<ResolveFormValues<TSchema, TFormValues>> {
  type TResolvedValues = ResolveFormValues<TSchema, TFormValues>;

  const { onFinish: onFinishFromProps, validator, autoSubmit } = opts ?? {};

  // Normalize autoSubmit config
  const autoSubmitConfig = normalizeAutoSubmitConfig(autoSubmit);
  const debounceMs = autoSubmitConfig.debounce ?? DEFAULT_DEBOUNCE_MS;

  const [formAnt] = Form.useForm<TResolvedValues>();
  const formSF = useFormSF({ form: formAnt });

  const [requiredFields] = useState<
    Array<StandardSchemaV1.Issue["path"]> | undefined
  >(() => {
    if (validator) {
      const result = validator["~standard"].validate({});
      if (result instanceof Promise) {
        warning(
          "Asynchronous schema validation is not supported and can lead to unexpected behavior. If you need to validate form data asynchronously, please add additional FormItem rules with custom async validators.",
        );
        return;
      }

      if (result.issues) {
        return result.issues
          .filter((issue) => issue.path !== undefined)
          .map((issue) => issue.path);
      }
      return [];
    }
  });

  const onFinish = async (values: TResolvedValues) => {
    if (!onFinishFromProps) return;
    if (!validator) {
      return onFinishFromProps(values);
    }
    return standardValidate(validator, values).then((result) => {
      if (result.success) {
        return onFinishFromProps(result.value as TResolvedValues);
      }
      const formErrors = mapIssuesToFormErrors(result.issues);
      formSF.form.setFields(formErrors);
    });
  };

  // Leading+trailing debounce for auto-submit:
  // - Leading: Instant feedback for discrete controls (Select, Radio, Checkbox)
  // - Trailing: Debounced for rapid typing in text inputs
  // - Equality check prevents duplicate submissions when values haven't changed
  const debouncedFinish = useDebounceCallback(onFinish, {
    delay: debounceMs,
    leading: true,
    trailing: true,
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });

  const onValuesChange: FormProps<TResolvedValues>["onValuesChange"] = (
    _changedValues,
    allValues,
  ) => {
    if (autoSubmitConfig.mode !== "auto") return;
    debouncedFinish(allValues);
  };

  const FormItem = useMemo(
    () =>
      createFormItem<TResolvedValues>({
        validator,
        requiredFields,
      }),
    [validator, requiredFields],
  );

  const FormList = useMemo(
    () =>
      createFormList<TResolvedValues>({
        validator,
      }),
    [validator],
  );

  // Build formProps based on autoSubmit mode
  const formProps: FormProps<TResolvedValues> = {
    ...formSF.formProps,
    onFinish,
    ...(autoSubmitConfig.mode === "auto" && {
      onValuesChange,
    }),
  };

  return {
    form: formAnt,
    FormItem,
    FormList,
    formProps,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function mapIssuesToFormErrors(
  issues: readonly StandardSchemaV1.Issue[],
): FieldData[] {
  return issues.map((issue) => {
    return {
      name: issue.path?.map((segment) =>
        typeof segment === "object" && "key" in segment ? segment.key : segment,
      ),
      errors: [issue.message],
    };
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type { TypedFormListProps, TypedFormListFieldData } from "./FormList";
export type { TypedFormItemComponent } from "./FormItem";
