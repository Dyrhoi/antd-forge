import { StandardSchemaV1 } from "@standard-schema/spec";
import { Form as AntdForm, FormInstance, FormProps } from "antd";
import { ReactNode, useMemo, useRef } from "react";
import { useForm as useFormSF } from "sunflower-antd";
import { createFormItem, TypedFormItemComponent } from "./FormItem";
import { createFormList, TypedFormListComponent } from "./FormList";
import { FieldData } from "./internal/antd-types";
import { FormProvider } from "./internal/FormProvider";
import {
  NamePrefixProvider,
  useNamePrefix,
} from "./internal/NamePrefixContext";
import { normalizePath } from "./internal/path-segments";
import {
  GetValueAtPath,
  InnerPathsTuple,
  NormalizeNamePath,
  NormalizeValueFn,
  SimplePathSegment,
} from "./internal/path-types";
import { standardValidate } from "./internal/standardSchemaValidator";
import invariant from "./internal/tiny-invariant";
import { useDebounceCallback } from "./internal/useDebounceCallback";
import { warning } from "./internal/warning";
import { createUseWatch, UseWatch } from "./useWatch";

// ============================================================================
// Auto-Submit Types
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

// ============================================================================
// Types
// ============================================================================

/**
 * Options for createFormHook factory.
 */
export interface CreateFormHookOptions<
  TSchema extends StandardSchemaV1 | undefined = undefined,
> {
  /**
   * A Standard Schema validator (e.g., Zod, Valibot, ArkType) for form validation.
   * This validator is pre-configured for all forms created with this hook.
   */
  validator?: TSchema;
}

/**
 * Options for useCustomForm (returned from createFormHook).
 */
export interface UseCustomFormOptions<TFormValues> {
  onFinish?: (values: NoInfer<TFormValues>) => Promise<void> | void;
  autoSubmit?: AutoSubmitOption;
  normalizeValue?: NormalizeValueFn<TFormValues>;
}

/**
 * Options for useCustomFormInstance.
 */
export interface UseCustomFormInstanceOptions<TPath> {
  /**
   * Path to scope the form instance to.
   * FormItem names will be relative to this path and type-narrowed accordingly.
   */
  inheritAt?: TPath;
}

/**
 * Return type for useCustomForm.
 */
export interface UseCustomFormReturn<TParsedValues> {
  form: FormInstance<TParsedValues>;
  formProps: FormProps<TParsedValues>;
  Form: (props: FormProps<TParsedValues>) => ReactNode;
  FormItem: TypedFormItemComponent<TParsedValues>;
  FormList: TypedFormListComponent<TParsedValues>;
  useWatch: UseWatch<TParsedValues>;
}

/**
 * Return type for useCustomFormInstance.
 */
export type UseCustomFormInstanceReturn<TResolvedValues> = Pick<
  UseCustomFormReturn<TResolvedValues>,
  "FormItem" | "FormList" | "useWatch" | "form"
>;

/**
 * Return type from createFormHook factory.
 */
export interface CreateFormHookReturn<TFormValues> {
  useCustomForm: UseCustomFormFn<TFormValues>;
  useCustomFormInstance: UseCustomFormInstanceFn<TFormValues>;
}

/**
 * Function signature for useCustomForm.
 */
export type UseCustomFormFn<TFormValues> = (
  opts?: UseCustomFormOptions<TFormValues>,
) => UseCustomFormReturn<TFormValues>;

/**
 * Function signature for useCustomFormInstance with type inference for inheritAt.
 */
export interface UseCustomFormInstanceFn<TFormValues> {
  (options?: {
    inheritAt?: undefined;
  }): UseCustomFormInstanceReturn<TFormValues>;
  <TPath extends InnerPathsTuple<TFormValues>>(options: {
    inheritAt: TPath;
  }): UseCustomFormInstanceReturn<
    GetValueAtPath<TFormValues, NormalizeNamePath<TPath>>
  >;
}

// ============================================================================
// Internal Helpers
// ============================================================================

const DEFAULT_DEBOUNCE_MS = 300;

function normalizeAutoSubmitConfig(
  option: AutoSubmitOption | undefined,
): AutoSubmitConfig {
  if (!option || option === "off") return { mode: "off" };
  if (typeof option === "string") return { mode: option };
  return option;
}

function mapIssuesToFormErrors(
  issues: readonly StandardSchemaV1.Issue[],
): FieldData[] {
  return issues.map((issue) => ({
    name: normalizePath(issue.path),
    errors: [issue.message],
  }));
}

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Resolves the form values type based on schema.
 * - If a schema is provided, infer from the schema
 * - Otherwise, use the explicit type parameter
 */
export type ResolveFormValues<TSchema, TExplicit> =
  TSchema extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<TSchema>
    : TExplicit;

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates a set of form hooks with a pre-configured validator.
 * Components are created ONCE and read configuration from context.
 *
 * @example
 * ```tsx
 * // formHooks.ts - Define once
 * export const {
 *   useCustomForm: useUserForm,
 *   useCustomFormInstance: useUserFormInstance,
 * } = createFormHook({ validator: userSchema });
 *
 * // UserForm.tsx
 * function UserForm() {
 *   const { Form, FormItem } = useUserForm({
 *     onFinish: (values) => saveUser(values),
 *   });
 *   return (
 *     <Form>
 *       <FormItem name="email"><Input /></FormItem>
 *       <AddressSection />
 *     </Form>
 *   );
 * }
 *
 * // AddressSection.tsx - Scoped types via inheritAt
 * function AddressSection() {
 *   const { FormItem } = useUserFormInstance({ inheritAt: ["address"] });
 *   return <FormItem name="street"><Input /></FormItem>;
 * }
 * ```
 */
export function createFormHook<
  TSchema extends StandardSchemaV1 | undefined = undefined,
  TFormValues = unknown,
>(
  factoryOptions?: CreateFormHookOptions<TSchema>,
): CreateFormHookReturn<ResolveFormValues<TSchema, TFormValues>> {
  type TResolvedValues = ResolveFormValues<TSchema, TFormValues>;
  const validator = factoryOptions?.validator;

  // ========================================
  // Create components ONCE at factory level
  // They read validator/requiredFields/normalizeValue from FormContext
  // They read prefix from NamePrefixContext
  // ========================================
  const FormItem = createFormItem<TResolvedValues>();
  const FormList = createFormList<TResolvedValues>();
  const useWatch = createUseWatch<TResolvedValues>();

  // Compute required fields once at factory level (only if validator exists)
  const requiredFields = (() => {
    if (!validator) return undefined;
    const result = validator["~standard"].validate({});
    if (result instanceof Promise) {
      warning(
        "Asynchronous schema validation is not supported. Required field detection disabled.",
      );
      return undefined;
    }
    if (result.issues) {
      return result.issues
        .filter((issue) => issue.path !== undefined)
        .map((issue) => issue.path);
    }
    return [];
  })();

  /**
   * Hook to create a form with pre-configured validator.
   */
  const useCustomForm: UseCustomFormFn<TResolvedValues> = (opts) => {
    const {
      onFinish: onFinishFromProps,
      autoSubmit,
      normalizeValue,
    } = opts ?? {};

    const autoSubmitConfig = normalizeAutoSubmitConfig(autoSubmit);
    const debounceMs = autoSubmitConfig.debounce ?? DEFAULT_DEBOUNCE_MS;

    const [formAnt] = AntdForm.useForm<TResolvedValues>();
    const formSF = useFormSF({ form: formAnt });

    const onFinish = async (values: TResolvedValues) => {
      if (!onFinishFromProps) return;
      // If no validator, just call onFinish directly
      if (!validator) {
        return onFinishFromProps(values);
      }
      const result = await standardValidate(validator, values);
      if (result.success) {
        return onFinishFromProps(result.value as TResolvedValues);
      }
      formSF.form.setFields(mapIssuesToFormErrors(result.issues));
    };

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
      if (autoSubmitConfig.mode === "auto") {
        debouncedFinish(allValues);
      }
    };

    const formProps: FormProps<TResolvedValues> = {
      ...formSF.formProps,
      onFinish,
      ...(autoSubmitConfig.mode === "auto" && { onValuesChange }),
    };

    // Stable Form component via ref
    const optsRef = useRef({
      formAnt,
      validator,
      requiredFields,
      normalizeValue,
      formProps,
    });
    optsRef.current = {
      formAnt,
      validator,
      requiredFields,
      normalizeValue,
      formProps,
    };

    const FormRef = useRef<
      ((props: FormProps<TResolvedValues>) => ReactNode) | null
    >(null);
    if (FormRef.current === null) {
      FormRef.current = function StableForm(props: FormProps<TResolvedValues>) {
        const currentOpts = optsRef.current;
        const { children, ...restProps } = props;
        return (
          <FormProvider
            formInstance={currentOpts.formAnt}
            validator={currentOpts.validator}
            requiredFields={currentOpts.requiredFields}
            normalizeValue={currentOpts.normalizeValue}
          >
            <AntdForm {...currentOpts.formProps} {...restProps}>
              {typeof children === "function"
                ? children(
                    currentOpts.formAnt.getFieldsValue(true),
                    currentOpts.formAnt,
                  )
                : children}
            </AntdForm>
          </FormProvider>
        );
      };
    }

    return {
      form: formAnt,
      formProps,
      Form: FormRef.current,
      FormItem,
      FormList,
      useWatch,
    };
  };

  /**
   * Hook to get form components from within the form tree.
   * Supports inheritAt for type-safe scoped access.
   */
  const useCustomFormInstance: UseCustomFormInstanceFn<
    TResolvedValues
  > = (options?: { inheritAt?: SimplePathSegment[] }) => {
    const inheritAtPath = options?.inheritAt;
    const formInstance = AntdForm.useFormInstance<TResolvedValues>();
    const { prefix: currentPrefix } = useNamePrefix();

    invariant(
      formInstance !== undefined,
      "useCustomFormInstance must be used within a Form",
    );

    // Determine effective prefix
    const effectivePrefix = inheritAtPath ?? currentPrefix;
    const hasPrefix = effectivePrefix.length > 0;

    // Wrap components to set prefix context when needed
    const wrappedFormItem = useMemo(() => {
      if (!hasPrefix) return FormItem;
      return function PrefixedFormItem(
        props: Parameters<typeof FormItem>[0],
      ): ReactNode {
        return (
          <NamePrefixProvider prefix={effectivePrefix}>
            <FormItem {...props} />
          </NamePrefixProvider>
        );
      };
    }, [hasPrefix, effectivePrefix]);

    const wrappedFormList = useMemo(() => {
      if (!hasPrefix) return FormList;
      return function PrefixedFormList(
        props: Parameters<typeof FormList>[0],
      ): ReactNode {
        return (
          <NamePrefixProvider prefix={effectivePrefix}>
            <FormList {...props} />
          </NamePrefixProvider>
        );
      };
    }, [hasPrefix, effectivePrefix]);

    // Return type is UseCustomFormInstanceReturn<any> at implementation level.
    // Callers get proper types via the UseCustomFormInstanceFn overloads.
    return {
      form: formInstance,
      FormItem: wrappedFormItem,
      FormList: wrappedFormList,
      useWatch,
    };
  };

  return {
    useCustomForm,
    useCustomFormInstance,
  };
}
