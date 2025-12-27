import { StandardSchemaV1 } from "@standard-schema/spec";
import { FormInstance } from "antd";
import { createContext } from "react";

export type FormContextValue<T> = {
  form: FormInstance<T>;
  validator?: StandardSchemaV1 | undefined;
  requiredFields?: Array<StandardSchemaV1.Issue["path"]>;
};

export const FormContext = createContext<FormContextValue<any> | null>(null);

export function FormProvider<
  TSchema extends StandardSchemaV1 | undefined,
  TFormValues,
>(props: {
  validator?: TSchema;
  requiredFields?: Array<StandardSchemaV1.Issue["path"]>;
  formInstance: FormInstance<TFormValues>;
  children: React.ReactNode;
}) {
  return (
    <FormContext.Provider
      value={{
        form: props.formInstance,
        validator: props.validator,
        requiredFields: props.requiredFields,
      }}
    >
      {props.children}
    </FormContext.Provider>
  );
}
