import { StandardSchemaV1 } from "@standard-schema/spec";
import { Form, FormInstance, FormProps } from "antd";
import { useForm as useFormSF } from "sunflower-antd";
import { standardValidate } from "./internal/standardSchemaValidator";

export interface UseFormReturn<TParsedValues = unknown> {
  form: FormInstance<TParsedValues>;
  formProps: FormProps<TParsedValues>;
  FormItem: typeof Form.Item<TParsedValues>;
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
  const [formAnt] = Form.useForm<unknown>();
  const formSF = useFormSF({ form: formAnt });

  const onFinish = async (values: unknown) => {
    if (!onFinishFromProps) return;
    if (!validator) return onFinishFromProps(values);
    const result = await standardValidate(validator, values);
    return onFinishFromProps(result);
  };

  return {
    form: formAnt,
    formProps: {
      ...formSF.formProps,
      onFinish,
    },
    FormItem: Form.Item,
  };
}
