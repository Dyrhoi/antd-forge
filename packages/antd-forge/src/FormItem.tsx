import { StandardSchemaV1 } from "@standard-schema/spec";
import { Form, FormItemProps } from "antd";
import { createContext, ReactNode, useContext } from "react";
import { useFormListContext } from "./FormList";
import { SimplePathSegment } from "./internal/path-types";
import { createSchemaRule } from "./internal/standardSchemaValidator";
import { NamePath } from "antd/es/form/interface";

const FormItemContext = createContext<{ name: NamePath | undefined } | null>(
  null,
);

export type TypedFormItemComponent<TParsedValues> = (
  props: FormItemProps<TParsedValues>,
) => ReactNode;

type CreateFormItemOptions = {
  validator?: StandardSchemaV1;
  requiredFields?: Array<StandardSchemaV1.Issue["path"]>;
  mode?: "none" | "inherit";
};

export function createFormItem<TParsedValues>(
  options: CreateFormItemOptions = {},
): TypedFormItemComponent<TParsedValues> {
  const { validator, requiredFields } = options;

  const FormItem: TypedFormItemComponent<TParsedValues> = ({
    rules,
    name: unprefixedName,
    ...rest
  }) => {
    const formListPrefix = useFormListContext()?.prefix || [];
    const formItemPrefix = useContext(FormItemContext)?.name || [];

    // If we have a formList prefix, check if our name contains the prefix already.
    // If it does, remove the prefix to avoid duplication (FormList already prefixes).
    let name = unprefixedName;
    if (formListPrefix.length > 0 && unprefixedName !== undefined) {
      const namePath = (
        Array.isArray(unprefixedName) ? unprefixedName : [unprefixedName]
      ) as SimplePathSegment[];
      const hasPrefix = formListPrefix.every(
        (segment, index) => segment === namePath[index],
      );
      if (hasPrefix) {
        name = namePath.slice(formListPrefix.length) as NamePath<TParsedValues>;
      }
    }

    const resolvedName = (
      options.mode === "inherit"
        ? Array.isArray(formItemPrefix)
          ? [...formItemPrefix, ...(Array.isArray(name) ? name : [name])]
          : name
        : name
    ) as NamePath<TParsedValues>;

    const defaultNormalize: FormItemProps<TParsedValues>["normalize"] = (
      value,
    ) => {
      // The default behavior of Antd here always catches me off guard.
      // When an Input is cleared (by using backspace), it sets the value to "" (empty string).
      // This causes issues with schema validation where a field is optional,
      // but an empty string is not valid for that field type (e.g., number, enum, etc).
      // Therefore, we normalize empty strings to undefined to represent "no value".
      // The user can override this behavior by providing their own `normalize` function.
      if (value === "") {
        return undefined;
      }
      return value;
    };

    if (!validator || !name) {
      return (
        <FormItemContext.Provider value={{ name }}>
          <Form.Item
            name={resolvedName}
            rules={rules}
            normalize={defaultNormalize}
            {...rest}
          />
        </FormItemContext.Provider>
      );
    }

    const fieldPath = (
      Array.isArray(name)
        ? [...formListPrefix, ...name]
        : [...formListPrefix, ...[name]]
    ) as SimplePathSegment[];

    const schemaRule = createSchemaRule(validator, { fieldPath });
    const mergedRules = [schemaRule, ...(rules ?? [])];
    const required = requiredFields?.some((path) => {
      if (!path) return false;
      if (path.length !== fieldPath.length) return false;
      return path.every((key, index) => key === fieldPath[index]);
    });

    return (
      <FormItemContext.Provider value={{ name: resolvedName }}>
        <Form.Item
          name={resolvedName}
          rules={mergedRules}
          required={required}
          normalize={defaultNormalize}
          {...rest}
        />
      </FormItemContext.Provider>
    );
  };

  return FormItem;
}
