import { Form, FormItemProps } from "antd";
import { NamePath } from "antd/es/form/interface";
import { ReactNode, useContext } from "react";
import { FormContext } from "./internal/FormProvider";
import {
  buildFullPath,
  NamePrefixProvider,
  useNamePrefix,
} from "./internal/NamePrefixContext";
import {
  arePathsEqual,
  createNormalizeParams,
  normalizeNamePath,
} from "./internal/path-segments";
import type { InnerPaths, NormalizeValueFn } from "./internal/path-types";
import { createSchemaRule } from "./internal/standardSchemaValidator";

/**
 * Props for the typed FormItem component.
 * Extends Ant Design's FormItemProps with type-safe name.
 *
 * Always requires the FULL path from schema root for complete type safety.
 */
export type TypedFormItemProps<TParsedValues> = Omit<
  FormItemProps<TParsedValues>,
  "name"
> & {
  /**
   * The FULL name path to the field from schema root.
   * Must be a valid path in your schema for full type safety.
   *
   * @example
   * ```tsx
   * // Simple field
   * <FormItem name={["username"]}>
   *
   * // Nested field
   * <FormItem name={["profile", "firstName"]}>
   *
   * // Inside FormList - include the index
   * <FormItem name={["users", index, "email"]}>
   * ```
   */
  name?: InnerPaths<TParsedValues>;
};

export type TypedFormItemComponent<TParsedValues> = (
  props: TypedFormItemProps<TParsedValues>,
) => ReactNode;

/**
 * Creates a typed FormItem component that wraps Ant Design's Form.Item.
 *
 * Reads all configuration from context:
 * - validator/requiredFields/normalizeValue from FormContext
 * - prefix from NamePrefixContext
 *
 * @example
 * ```tsx
 * // Direct usage - always full path
 * <FormItem name={["username"]}>
 *   <Input />
 * </FormItem>
 *
 * // Inside FormList - include the index in the path
 * <FormList name={["users"]}>
 *   {(fields) => fields.map(({ key, name: index }) => (
 *     <div key={key}>
 *       <FormItem name={["users", index, "email"]}>
 *         <Input />
 *       </FormItem>
 *     </div>
 *   ))}
 * </FormList>
 *
 * // For composable sub-components, use useFormInstance with inherit
 * <FormItem name={["users", 0, "profile"]}>
 *   <ProfileFields /> // uses useFormInstance to inherit prefix
 * </FormItem>
 * ```
 */
export function createFormItem<
  TParsedValues,
>(): TypedFormItemComponent<TParsedValues> {
  const FormItem: TypedFormItemComponent<TParsedValues> = ({
    rules,
    name,
    children,
    normalize,
    ...rest
  }) => {
    const formContext = useContext(FormContext);
    const { prefix } = useNamePrefix();

    const validator = formContext?.validator;
    const requiredFields = formContext?.requiredFields;
    const normalizeValue = formContext?.normalizeValue as
      | NormalizeValueFn<TParsedValues>
      | undefined;

    const hasPrefix = prefix.length > 0;

    // Convert name to array path
    const namePath = normalizeNamePath(name);

    // Build full path - prepend prefix if in inherit mode
    const fullPath = namePath
      ? hasPrefix
        ? buildFullPath(prefix, namePath)
        : namePath
      : undefined;

    // Build normalize function: per-item normalize prop takes precedence,
    // then global normalizeValue, then no normalization
    const resolvedNormalize: FormItemProps<TParsedValues>["normalize"] =
      normalize !== undefined
        ? normalize
        : normalizeValue && fullPath
          ? (value) => normalizeValue(createNormalizeParams(fullPath, value))
          : undefined;

    // Build schema validation rule if validator is provided
    const schemaRule =
      validator && fullPath
        ? createSchemaRule(validator, { fieldPath: fullPath })
        : undefined;
    const mergedRules = schemaRule ? [schemaRule, ...(rules ?? [])] : rules;

    // Check if field is required based on schema
    const required =
      fullPath && requiredFields
        ? requiredFields.some((path) => arePathsEqual(path, fullPath))
        : undefined;

    const formItem = (
      <Form.Item
        name={fullPath as NamePath<TParsedValues>}
        rules={mergedRules}
        required={required}
        normalize={resolvedNormalize}
        {...rest}
      >
        {children}
      </Form.Item>
    );

    // In inherit mode (has prefix), don't set a new prefix context
    // In normal mode, set this path as prefix for useFormInstance children
    if (hasPrefix) {
      return formItem;
    }

    return (
      <NamePrefixProvider prefix={fullPath ?? []}>
        {formItem}
      </NamePrefixProvider>
    );
  };

  return FormItem;
}
