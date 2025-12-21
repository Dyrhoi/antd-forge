import type { FormInstance, Form, GetProps } from "antd";
export type FieldError = ReturnType<FormInstance["getFieldsError"]>[number];
export type FieldData = Parameters<FormInstance["setFields"]>[0][number];
export type FormListProps = GetProps<typeof Form.List>;
export type UseWatchProps = Parameters<typeof Form.useWatch>[1];
export type WatchOptions = Extract<Parameters<typeof Form.useWatch>[1], {preserve?: boolean}>;
export type NamePath<TParsedValues = unknown> = Parameters<
  FormInstance<TParsedValues>["getFieldValue"]
>[0];