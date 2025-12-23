import { Form } from "antd";
import { useContext, useMemo } from "react";
import { createFormItem } from "./FormItem";
import { createFormList } from "./FormList";
import { FormContext } from "./internal/FormProvider";
import invariant from "./internal/tiny-invariant";
import { UseFormReturn } from "./useForm";
import { createUseWatch } from "./useWatch";
import { NamePath } from "./internal/antd-types";

type UseFormInstanceReturn<TResolvedValues> = Pick<
  UseFormReturn<TResolvedValues>,
  "FormItem" | "FormList" | "useWatch" | "form"
>;

type UseFormInstanceOptions = {
  mode?: "none" | "inherit";
};

export function useFormInstance<TResolvedValues>({
  mode = "none",
}: UseFormInstanceOptions = {}): UseFormInstanceReturn<TResolvedValues> {
  const formInstance = Form.useFormInstance<TResolvedValues>();
  const formContext = useContext(FormContext);

  invariant(
    formContext !== null,
    "useFormInstance must be used within a FormProvider",
  );

  const { validator, requiredFields } = formContext;

  const FormItem = useMemo(
    () =>
      createFormItem<TResolvedValues>({
        validator,
        requiredFields,
        mode,
      }),
    [validator, requiredFields, mode],
  );

  const FormList = useMemo(
    () =>
      createFormList<TResolvedValues>({
        validator,
      }),
    [validator],
  );

  const useWatch = useMemo(() => {
    return createUseWatch({ form: formInstance });
  }, [formInstance]);

  return {
    form: formInstance,
    FormItem,
    FormList,
    useWatch,
  };
}
