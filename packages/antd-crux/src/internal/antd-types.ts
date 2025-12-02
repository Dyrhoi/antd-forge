import type { FormInstance, Form, GetProps } from "antd";
export type FieldError = ReturnType<FormInstance["getFieldsError"]>[number];
export type FieldData = Parameters<FormInstance["setFields"]>[0][number];
export type FormListProps = GetProps<typeof Form.List>;
