import { StandardSchemaV1 } from "@standard-schema/spec";
import { FormInstance } from "antd";
import { createContext } from "react";
import type { NormalizeValueFn } from "./path-types";

export type FormContextValue<T> = {
  form: FormInstance<T>;
  validator?: StandardSchemaV1 | undefined;
  requiredFields?: Array<StandardSchemaV1.Issue["path"]>;
  normalizeValue?: NormalizeValueFn<T>;
};

export const FormContext = createContext<FormContextValue<any> | null>(null);

export function FormProvider<
  TSchema extends StandardSchemaV1 | undefined,
  TFormValues,
>(props: {
  validator?: TSchema;
  requiredFields?: Array<StandardSchemaV1.Issue["path"]>;
  normalizeValue?: NormalizeValueFn<TFormValues>;
  formInstance: FormInstance<TFormValues>;
  children: React.ReactNode;
}) {
  return (
    <FormContext.Provider
      value={{
        form: props.formInstance,
        validator: props.validator,
        requiredFields: props.requiredFields,
        normalizeValue: props.normalizeValue,
      }}
    >
      {props.children}
    </FormContext.Provider>
  );
}
