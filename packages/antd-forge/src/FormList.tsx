import { StandardSchemaV1 } from "@standard-schema/spec";
import { Form, FormItemProps, FormListFieldData } from "antd";
import { createContext, ReactNode, useContext } from "react";
import { FormListProps } from "./internal/antd-types";
import {
  GetArrayItemType,
  InnerPaths,
  NormalizeNamePath,
  SimplePathSegment,
} from "./internal/path-types";
import { createSchemaRule } from "./internal/standardSchemaValidator";

type FormListFieldName<TName> = [...NormalizeNamePath<TName>, number];

/**
 * Type-safe getName function for FormList fields.
 * Takes a relative path within the array item and returns the full form path.
 * @internal
 */
type GetNameFn<TParsedValues, TName> = <
  TRelativePath extends InnerPaths<GetArrayItemType<TParsedValues, TName>>,
>(
  relativePath: TRelativePath,
) => [...FormListFieldName<TName>, ...TRelativePath];

export type TypedFormListFieldData<TParsedValues, TName> = Omit<
  FormListFieldData,
  "name"
> & {
  name: number;
  getName: GetNameFn<TParsedValues, TName>;
};

export type TypedFormListProps<
  TParsedValues,
  TName extends FormItemProps<TParsedValues>["name"] =
    FormItemProps<TParsedValues>["name"],
> = Omit<FormListProps, "name" | "children"> & {
  name: TName;
  children: (
    fields: Array<TypedFormListFieldData<TParsedValues, TName>>,
    operation: Parameters<FormListProps["children"]>[1],
    meta: Parameters<FormListProps["children"]>[2],
  ) => ReactNode;
};

type FormListContextValue = {
  prefix: SimplePathSegment[];
} | null;

export const FormListContext = createContext<FormListContextValue>(null);

export const useFormListContext = () => useContext(FormListContext);

export type TypedFormListComponent<TParsedValues> = <
  TName extends FormItemProps<TParsedValues>["name"],
>(
  props: TypedFormListProps<TParsedValues, TName>,
) => ReactNode;

type CreateFormItemOptions = {
  validator?: StandardSchemaV1;
};

/**
 * Creates a typed FormList component bound to the form's parsed values type.
 */
export function createFormList<TParsedValues>(
  options: CreateFormItemOptions = {},
): TypedFormListComponent<TParsedValues> {
  const { validator } = options;

  const FormList: TypedFormListComponent<TParsedValues> = ({
    name,
    children,
    rules,
    ...rest
  }) => {
    const prefixPath = (
      Array.isArray(name) ? name : [name]
    ) as SimplePathSegment[];

    const schemaRule = validator
      ? createSchemaRule(validator, { fieldPath: prefixPath })
      : undefined;
    const mergedRules = [schemaRule, ...(rules ?? [])].filter(
      (rule): rule is NonNullable<FormListProps["rules"]>[number] =>
        rule !== undefined,
    );

    return (
      <FormListContext.Provider value={{ prefix: prefixPath }}>
        <Form.List name={prefixPath} rules={mergedRules} {...rest}>
          {(fields, operation, meta) =>
            children(
              fields.map(({ name: fieldIndex, ...restField }) => ({
                ...restField,
                name: fieldIndex,
                getName: (relativePath: SimplePathSegment[]) => [
                  ...prefixPath,
                  fieldIndex,
                  ...relativePath,
                ],
              })) as Parameters<typeof children>[0],
              operation,
              meta,
            )
          }
        </Form.List>
      </FormListContext.Provider>
    );
  };

  return FormList;
}
