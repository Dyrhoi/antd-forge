import { Form, FormListFieldData, FormListOperation } from "antd";
import { ReactNode, useState, useEffect, useContext } from "react";
import { FormListProps } from "./internal/antd-types";
import { useNamePrefix } from "./internal/NamePrefixContext";
import { normalizeNamePath } from "./internal/path-segments";
import { GetArrayItemType, InnerPaths } from "./internal/path-types";
import { FormContext } from "./internal/FormProvider";
import { createSchemaRule } from "./internal/standardSchemaValidator";

/**
 * Field data for each item in the FormList.
 * - `key` is a stable React key
 * - `name` is the array index (use to construct full paths in FormItem)
 */
export type TypedFormListFieldData = FormListFieldData;

/**
 * Meta information about the FormList.
 */
export type FormListMeta = {
  errors: ReactNode[];
};

export type TypedFormListProps<
  TParsedValues,
  TName extends InnerPaths<TParsedValues> = InnerPaths<TParsedValues>,
> = Omit<FormListProps, "name" | "children" | "initialValue"> & {
  /** The name path to the array field */
  name: TName;
  /** Initial value for the array */
  initialValue?: Partial<GetArrayItemType<TParsedValues, TName>>[];
  /** Render function for the list items */
  children: (
    fields: TypedFormListFieldData[],
    operation: FormListOperation,
    meta: FormListMeta,
  ) => ReactNode;
};

export type TypedFormListComponent<TParsedValues> = <
  TName extends InnerPaths<TParsedValues>,
>(
  props: TypedFormListProps<TParsedValues, TName>,
) => ReactNode;

/**
 * Creates a typed FormList component that wraps antd's Form.List.
 *
 * Reads prefix from NamePrefixContext.
 *
 * This uses a "shadow" Form.List pattern:
 * - Form.List is rendered to get the operations (add, remove, move) and field tracking
 * - Children are rendered OUTSIDE the Form.List to avoid antd's automatic name prefixing
 * - FormItem uses full paths like ["users", index, "email"]
 *
 * @example
 * ```tsx
 * <FormList name={["users"]} initialValue={[{ email: "" }]}>
 *   {(fields, { add, remove }) => (
 *     <>
 *       {fields.map(({ key, name: index }) => (
 *         <div key={key}>
 *           <FormItem name={["users", index, "email"]}>
 *             <Input />
 *           </FormItem>
 *           <Button onClick={() => remove(index)}>Remove</Button>
 *         </div>
 *       ))}
 *       <Button onClick={() => add()}>Add</Button>
 *     </>
 *   )}
 * </FormList>
 * ```
 */
export function createFormList<
  TParsedValues,
>(): TypedFormListComponent<TParsedValues> {
  const TypedFormList: TypedFormListComponent<TParsedValues> = ({
    name,
    children,
    initialValue,
    ...rest
  }) => {
    const { prefix } = useNamePrefix();

    // Convert name to array path
    const rawNamePath = normalizeNamePath(name);

    // Prepend prefix if available
    const namePath =
      prefix.length > 0 ? [...prefix, ...rawNamePath] : rawNamePath;

    // State to capture Form.List's fields, operation, and meta
    const [listState, setListState] = useState<{
      fields: TypedFormListFieldData[];
      operation: FormListOperation;
      meta: FormListMeta;
    }>({
      fields: [],
      operation: {
        add: () => {},
        remove: () => {},
        move: () => {},
      },
      meta: { errors: [] },
    });

    return (
      <>
        {/* Shadow Form.List - captures operations, fields, and validates with rules */}
        <Form.List name={namePath} initialValue={initialValue} {...rest}>
          {(fields, operation, meta) => {
            // Update state when Form.List re-renders
            // We need to do this in a layout effect to avoid render loops
            return (
              <ShadowCapture
                fields={fields}
                operation={operation}
                meta={meta}
                onCapture={setListState}
              />
            );
          }}
        </Form.List>
        {/* Wrap children in Form.Item for proper error styling (no name - just for layout) */}
        {children(listState.fields, listState.operation, listState.meta)}
      </>
    );
  };

  return TypedFormList;
}

/**
 * Helper component to capture Form.List state without causing render loops
 */
function ShadowCapture({
  fields,
  operation,
  meta,
  onCapture,
}: {
  fields: TypedFormListFieldData[];
  operation: FormListOperation;
  meta: FormListMeta;
  onCapture: (state: {
    fields: TypedFormListFieldData[];
    operation: FormListOperation;
    meta: FormListMeta;
  }) => void;
}) {
  useEffect(() => {
    onCapture({ fields, operation, meta });
  }, [fields, operation, meta, onCapture]);

  return null; // Render nothing
}
