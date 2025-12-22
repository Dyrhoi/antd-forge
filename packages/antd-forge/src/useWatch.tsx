import { Form, FormInstance } from "antd";
import {
  NamePathValue,
  NormalizeNamePath,
  DeepPartial,
} from "./internal/path-types";
import { NamePath, WatchOptions } from "./internal/antd-types";

export type UseWatch<TParsedValues = unknown> = <
  TPath extends NamePath<TParsedValues>,
>(
  dependency: TPath,
  options?: Omit<WatchOptions, "form">,
) =>
  | DeepPartial<NamePathValue<TParsedValues, NormalizeNamePath<TPath>>>
  | undefined;

export function createUseWatch<TParsedValues = unknown>({
  form,
}: {
  form: FormInstance<TParsedValues>;
}): UseWatch<TParsedValues> {
  return function useTypedWatch<TPath extends NamePath<TParsedValues>>(
    dependency: TPath,
    options?: Omit<WatchOptions, "form">,
  ) {
    return Form.useWatch(dependency, { ...options, form });
  };
}
