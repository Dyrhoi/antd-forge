import { Form, FormInstance } from "antd";
import { useContext } from "react";
import { FormContext } from "./internal/FormProvider";
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

/**
 * Creates a useWatch hook.
 * If form is provided, uses that form instance.
 * Otherwise, reads from FormContext at call time.
 */
export function createUseWatch<TParsedValues = unknown>(options?: {
  form?: FormInstance<TParsedValues>;
}): UseWatch<TParsedValues> {
  const formFromOptions = options?.form;

  return function useTypedWatch<TPath extends NamePath<TParsedValues>>(
    dependency: TPath,
    watchOptions?: Omit<WatchOptions, "form">,
  ) {
    // Read from context if form not provided in options
    const formContext = useContext(FormContext);
    const form = formFromOptions ?? formContext?.form;
    return Form.useWatch(dependency, { ...watchOptions, form });
  };
}
