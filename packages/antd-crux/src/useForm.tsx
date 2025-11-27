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
// Types
// ============================================================================

export interface UseFormReturn<TParsedValues = unknown> {
  form: FormInstance<TParsedValues>;
  formProps: FormProps<TParsedValues>;
  FormItem: TypedFormItemComponent<TParsedValues>;
  FormList: TypedFormListComponent<TParsedValues>;
}

type UseFormOptions<TFormValues> = {
  onFinish?: (values: TFormValues) => Promise<void> | void;
  validator?: StandardSchemaV1;
};

// ============================================================================
// Overloads
// ============================================================================

// Overload: schema-driven usage (validator provided)
export function useForm<TSchema extends StandardSchemaV1>(opts: {
  validator: TSchema;
  onFinish?: (
    values: StandardSchemaV1.InferOutput<TSchema>,
  ) => Promise<void> | void;
}): UseFormReturn<StandardSchemaV1.InferOutput<TSchema>>;

// Overload: generic or no-validator usage
export function useForm<TFormValues = unknown>(opts?: {
  onFinish?: (values: TFormValues) => Promise<void> | void;
  validator?: undefined;
}): UseFormReturn<TFormValues>;

// ============================================================================
// Implementation
// ============================================================================

export function useForm<TFormValues = unknown>({
  onFinish: onFinishFromProps,
  validator,
}: UseFormOptions<TFormValues> = {}): UseFormReturn<TFormValues> {
  const [formAnt] = Form.useForm<TFormValues>();
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

  const onFinish = async (values: TFormValues) => {
    if (!onFinishFromProps) return;
    if (!validator) {
      return onFinishFromProps(values);
    }
    return standardValidate(validator, values).then((result) => {
      if (result.success) {
        return onFinishFromProps(result.value as TFormValues);
      }
      const formErrors = mapIssuesToFormErrors(result.issues);
      formSF.form.setFields(formErrors);
    });
  };

  const FormItem = createFormItem<TFormValues>({
    validator,
    requiredFields,
  });

  const FormList = createFormList<TFormValues>({
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
