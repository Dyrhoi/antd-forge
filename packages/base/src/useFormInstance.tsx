import { useRef } from "react";
import {
  createFormHook,
  CreateFormHookReturn,
  UseCustomFormInstanceReturn,
} from "./createFormHook";

type UseFormInstanceOptions = {
  /**
   * When true, FormItem reads prefix from parent FormItem context
   * and allows relative paths. Use for composable sub-components.
   *
   * @default false
   */
  inherit?: boolean;
};

type UseFormInstanceReturn<TResolvedValues> =
  UseCustomFormInstanceReturn<TResolvedValues>;

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

  const factoryRef = useRef<CreateFormHookReturn<TResolvedValues> | null>(null);

  // Only recreate if validator reference changes
  if (factoryRef.current === null) {
    factoryRef.current =
      createFormHook() as CreateFormHookReturn<TResolvedValues>;
  }

  const { useCustomFormInstance } = factoryRef.current;

  // inheritAt controls prefix behavior:
  // - undefined: inherit prefix from parent context (for composable sub-components)
  // - []: start from root, no prefix inheritance (default behavior)
  const inheritAt = inherit ? undefined : ([] as never);
  return useCustomFormInstance({ inheritAt });
}
