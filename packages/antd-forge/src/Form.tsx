import { FormProps } from "antd";
import { Form as AntdForm } from "antd";
import { FormContextValue, FormProvider } from "./internal/FormProvider";
import { useRef, RefObject } from "react";

export type CreateFormOptions<TParsedValues> =
  FormContextValue<TParsedValues> & {
    internalFormProps: FormProps<TParsedValues>;
  };
export type TypedFormComponent<TParsedValues> = {
  (props: FormProps<TParsedValues>): React.ReactNode;
};

/**
 * Internal Form component that reads configuration from a ref.
 * This allows the component identity to remain stable while
 * the configuration can be updated on each render.
 */
function FormInner<TParsedValues>({
  optsRef,
  ...props
}: FormProps<TParsedValues> & {
  optsRef: RefObject<CreateFormOptions<TParsedValues>>;
}): React.ReactNode {
  const opts = optsRef.current;
  const { children, ...formProps } = props;

  return (
    <FormProvider
      formInstance={opts.form}
      validator={opts.validator}
      requiredFields={opts.requiredFields}
    >
      <AntdForm {...opts.internalFormProps} {...formProps}>
        {typeof children === "function"
          ? children(opts.form.getFieldsValue(true), opts.form)
          : children}
      </AntdForm>
    </FormProvider>
  );
}

/**
 * Hook that creates a stable Form component.
 * Uses a ref to pass configuration to avoid creating a new component on each render.
 */
export function useStableForm<TParsedValues>(
  opts: CreateFormOptions<TParsedValues>,
): TypedFormComponent<TParsedValues> {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Create the Form component only once using useRef
  const FormRef = useRef<TypedFormComponent<TParsedValues> | null>(null);
  if (FormRef.current === null) {
    FormRef.current = (props: FormProps<TParsedValues>) => (
      <FormInner {...props} optsRef={optsRef} />
    );
  }

  return FormRef.current;
}

/**
 * @deprecated Use useStableForm hook instead for stable component identity.
 * Creates a Form component factory (creates new component on each call).
 */
export function createForm<TParsedValues>(
  opts: CreateFormOptions<TParsedValues>,
): TypedFormComponent<TParsedValues> {
  const Form: TypedFormComponent<TParsedValues> = (
    props: FormProps<TParsedValues>,
  ) => {
    const { children, ...formProps } = props;

    return (
      <FormProvider
        formInstance={opts.form}
        validator={opts.validator}
        requiredFields={opts.requiredFields}
      >
        <AntdForm {...opts.internalFormProps} {...formProps}>
          {typeof children === "function"
            ? children(opts.form.getFieldsValue(true), opts.form)
            : children}
        </AntdForm>
      </FormProvider>
    );
  };

  return Form;
}
