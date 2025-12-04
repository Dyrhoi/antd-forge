import { StandardSchemaV1 } from "@standard-schema/spec";
import { Form, FormInstance, FormProps } from "antd";
import { useState } from "react";
import { useForm as useFormSF } from "sunflower-antd";
import { createFormItem, TypedFormItemComponent } from "./FormItem";
import { createFormList, TypedFormListComponent } from "./FormList";
import { FieldData } from "./internal/antd-types";
import { standardValidate } from "./internal/standardSchemaValidator";
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

  const { onFinish: onFinishFromProps, validator } = opts ?? {};

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

  const FormItem = createFormItem<TResolvedValues>({
    validator,
    requiredFields,
  });

  const FormList = createFormList<TResolvedValues>({
    validator,
  });

  return {
    form: formAnt,
    FormItem,
    FormList,
    formProps: {
      ...formSF.formProps,
      onFinish,
    },
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
