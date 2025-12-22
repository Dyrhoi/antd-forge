import { StandardSchemaV1 } from "@standard-schema/spec";
import { Form, FormItemProps } from "antd";
import { ReactNode } from "react";
import { useFormListContext } from "./FormList";
import { SimplePathSegment } from "./internal/path-types";
import { createSchemaRule } from "./internal/standardSchemaValidator";
import useFormInstance from "antd/es/form/hooks/useFormInstance";

export type TypedFormItemComponent<TParsedValues> = (
  props: FormItemProps<TParsedValues>,
) => ReactNode;

type CreateFormItemOptions = {
  validator?: StandardSchemaV1;
  requiredFields?: Array<StandardSchemaV1.Issue["path"]>;
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

    // If we have a formList prefix, check if our name contains the prefix already.
    // If it does, remove the prefix to avoid duplication (FormList already prefixes).
    let name: FormItemProps<TParsedValues>["name"] = unprefixedName;
    if (formListPrefix.length > 0 && unprefixedName !== undefined) {
      const namePath = (
        Array.isArray(unprefixedName) ? unprefixedName : [unprefixedName]
      ) as SimplePathSegment[];
      const hasPrefix = formListPrefix.every(
        (segment, index) => segment === namePath[index],
      );
      if (hasPrefix) {
        name = namePath.slice(
          formListPrefix.length,
        ) as FormItemProps<TParsedValues>["name"];
      }
    }

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
        <Form.Item
          name={name}
          rules={rules}
          normalize={defaultNormalize}
          {...rest}
        />
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
      <Form.Item
        name={name}
        rules={mergedRules}
        required={required}
        normalize={defaultNormalize}
        {...rest}
      />
    );
  };

  return FormItem;
}
