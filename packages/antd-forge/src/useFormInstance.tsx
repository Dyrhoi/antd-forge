import { Form } from "antd";
import { useContext, useMemo } from "react";
import { createFormItem, TypedFormItemComponent } from "./FormItem";
import { createFormList } from "./FormList";
import { FormContext } from "./internal/FormProvider";
import { useNamePrefix } from "./internal/NamePrefixContext";
import invariant from "./internal/tiny-invariant";
import { UseFormReturn } from "./useForm";
import { createUseWatch } from "./useWatch";

type UseFormInstanceOptions = {
  /**
   * When true, FormItem reads prefix from parent FormItem context
   * and allows relative paths. Use for composable sub-components.
   *
   * @default false
   */
  inherit?: boolean;
};

type UseFormInstanceReturn<TResolvedValues> = Pick<
  UseFormReturn<TResolvedValues>,
  "FormItem" | "FormList" | "useWatch" | "form"
>;

/**
 * Hook to get form components from within a form tree.
 *
 * @param options.inherit - When true, FormItem uses relative paths that inherit
 *                          from parent FormItem's prefix (for composable sub-components)
 *
 * @example
 * ```tsx
 * // Default mode (inherit: false) - full paths required
 * function MyComponent() {
 *   const { FormItem } = useFormInstance<MyForm>();
 *   return (
 *     <FormItem name={["users", 0, "email"]}>
 *       <Input />
 *     </FormItem>
 *   );
 * }
 *
 * // Inherit mode - for composable sub-components
 * function AddressFields() {
 *   const { FormItem } = useFormInstance<AddressForm>({ inherit: true });
 *
 *   // Paths are relative to parent FormItem's prefix
 *   return (
 *     <>
 *       <FormItem name={["street"]}>
 *         <Input />
 *       </FormItem>
 *       <FormItem name={["city"]}>
 *         <Input />
 *       </FormItem>
 *     </>
 *   );
 * }
 *
 * // Usage: AddressFields inherits prefix ["users", 0, "address"]
 * <FormItem name={["users", 0, "address"]}>
 *   <AddressFields />
 * </FormItem>
 * ```
 */
export function useFormInstance<TResolvedValues>(
  options: UseFormInstanceOptions = {},
): UseFormInstanceReturn<TResolvedValues> {
  const { inherit = false } = options;

  const formInstance = Form.useFormInstance<TResolvedValues>();
  const formContext = useContext(FormContext);
  const { prefix: currentPrefix } = useNamePrefix();

  invariant(
    formContext !== null,
    "useFormInstance must be used within a FormProvider",
  );

  const { validator, requiredFields } = formContext;

  // Create FormItem based on inherit mode
  const FormItem: TypedFormItemComponent<TResolvedValues> = useMemo(() => {
    if (inherit) {
      // Inherit mode: read prefix from context, allow relative paths
      return createFormItem<TResolvedValues>({
        validator,
        requiredFields,
        prefix: currentPrefix,
      });
    }
    // Default mode: full paths required (same as useForm's FormItem)
    return createFormItem<TResolvedValues>({
      validator,
      requiredFields,
    });
  }, [inherit, validator, requiredFields, currentPrefix]);

  const FormList = useMemo(() => {
    if (inherit) {
      // Inherit mode: prepend prefix to FormList name
      return createFormList<TResolvedValues>({ prefix: currentPrefix });
    }
    return createFormList<TResolvedValues>();
  }, [inherit, currentPrefix]);

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
