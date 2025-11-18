import { StandardSchemaV1 } from "@standard-schema/spec";
import type { ReactElement } from "react";
import { Form, FormInstance, FormItemProps, FormProps } from "antd";
import { useForm as useFormSF } from "sunflower-antd";
import { standardValidate } from "./internal/standardSchemaValidator";

export interface UseFormReturn<TParsedValues = unknown> {
  form: FormInstance<TParsedValues>;
  formProps: FormProps<TParsedValues>;
  FormItem: (props: FormItemProps<TParsedValues>) => ReactElement;
}

type ImplOpts = {
  onFinish?: (values: unknown) => Promise<void> | void;
  validator?: StandardSchemaV1;
};

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

export function useForm({
  onFinish: onFinishFromProps,
  validator,
}: ImplOpts = {}): UseFormReturn<unknown> {
  const [_formAnt] = Form.useForm<unknown>();
  const formSF = useFormSF({ form: _formAnt });

  const onFinish = async (values: unknown) => {
    if (!onFinishFromProps) return;
    if (!validator) {
      return onFinishFromProps(values);
    }
    return standardValidate(validator, values).then((result) => {
      if (result.success) {
        return onFinishFromProps(result.value);
      }
      const formErrors = result.issues.map((issue) => {
        return {
          name: issue.path?.map((segment) =>
            typeof segment === "object" && "key" in segment
              ? segment.key
              : segment,
          ),
          errors: [issue.message],
        };
      });
      formSF.form.setFields(formErrors);
    });
  };

  // eslint-disable-next-line react/prop-types -- enforced via TypeScript generics
  const FormItem: UseFormReturn["FormItem"] = ({ rules, name, ...rest }) => {
    if (!validator || !name) {
      return <Form.Item name={name} rules={rules} {...rest} />;
    }

    const fieldPath = Array.isArray(name) ? name : [name];
    type RulesType = NonNullable<FormItemProps["rules"]>;
    const schemaRule: RulesType[number] = ({
      getFieldsValue,
    }: {
      getFieldsValue: typeof _formAnt.getFieldsValue;
    }) => ({
      validator: async () => {
        const allValues = getFieldsValue(true);
        const result = await standardValidate(validator, allValues);
        if (result.success) {
          return Promise.resolve();
        }

        const matchingIssue = result.issues.find((issue) => {
          if (!issue.path) return false;
          const issuePath = issue.path.map((segment) =>
            typeof segment === "object" && "key" in segment
              ? segment.key
              : segment,
          );
          if (issuePath.length !== fieldPath.length) return false;
          return issuePath.every((key, index) => key === fieldPath[index]);
        });

        if (!matchingIssue) {
          return Promise.resolve();
        }

        return Promise.reject(new Error(matchingIssue.message));
      },
    });

    const mergedRules = [schemaRule, ...(rules ?? [])] as RulesType;

    return <Form.Item name={name} rules={mergedRules} {...rest} />;
  };

  return {
    form: _formAnt,
    FormItem,
    formProps: {
      ...formSF.formProps,
      onFinish,
    },
  };
}
