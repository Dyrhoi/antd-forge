import type { StandardSchemaV1 } from "@standard-schema/spec";
import { arePathsEqual, normalizePath } from "./path-segments";
import type { SimplePathSegment } from "./path-types";
import { FormRule } from "antd";

type ValidationResult<T> =
  | { value: T; issues?: undefined; success: true }
  | { value?: undefined; issues: StandardSchemaV1.Issue[]; success: false };

export async function standardValidate<T extends StandardSchemaV1>(
  schema: T,
  input: StandardSchemaV1.InferInput<T>,
): Promise<ValidationResult<StandardSchemaV1.InferOutput<T>>> {
  let result = schema["~standard"].validate(input);
  if (result instanceof Promise) result = await result;

  // if the `issues` field exists, the validation failed
  if (result.issues) {
    return {
      success: false,
      issues: result.issues as StandardSchemaV1.Issue[],
      value: undefined,
    };
  }

  return {
    success: true,
    value: result.value,
  };
}

export function createSchemaRule<TSchema extends StandardSchemaV1>(
  validator: TSchema,
  { fieldPath }: { fieldPath: SimplePathSegment[] },
): FormRule {
  return ({ getFieldsValue }) => ({
    validator: async () => {
      const allValues = getFieldsValue(true);
      const result = await standardValidate(validator, allValues);
      if (result.success) {
        return Promise.resolve();
      }

      const matchingIssue = result.issues.find((issue) => {
        if (!issue.path) return false;
        const issuePath = normalizePath(issue.path);
        return arePathsEqual(issuePath, fieldPath);
      });

      if (!matchingIssue) {
        return Promise.resolve();
      }

      return Promise.reject(new Error(matchingIssue.message));
    },
  });
}
