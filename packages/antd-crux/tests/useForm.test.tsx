import {
  act,
  renderHook,
  render,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import z from "zod";
import { useForm } from "../src";
import { Form, Input, InputNumber } from "antd";

describe("useForm", () => {
  describe("useForm-schema-driven", () => {
    const schema = z.object({ name: z.string(), age: z.coerce.number() });

    it("submit uses schema to validate/coerce values and calls onFinish with parsed output", async () => {
      const onFinish = vi.fn();
      const { result } = renderHook(() =>
        useForm({ validator: schema, onFinish }),
      );

      await act(async () => {
        // set values; age as string to exercise z.coerce.number()
        result.current.form.setFieldsValue({
          name: "Alice",
          age: "30" as unknown as number,
        });

        const values = result.current.form.getFieldsValue(true);
        result.current.formProps.onFinish?.(values);
      });

      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(onFinish).toHaveBeenCalledWith({ name: "Alice", age: 30 });
    });

    it("renders Form.Items and submits via DOM, calling onFinish with parsed values", async () => {
      const onFinish = vi.fn();
      function Comp() {
        const { formProps, FormItem } = useForm({
          validator: schema,
          onFinish,
        });

        return (
          <Form {...formProps}>
            <FormItem name={["name"]}>
              <Input />
            </FormItem>
            <FormItem name={["age"]}>
              <InputNumber />
            </FormItem>
            <button type="submit">Submit</button>
          </Form>
        );
      }

      const { container, getByText } = render(<Comp />);

      const inputs = container.querySelectorAll("input");
      const nameInput = inputs[0]! as HTMLInputElement;
      const ageInput = inputs[1]! as HTMLInputElement;
      // fill inputs: name then age (age as string to exercise z.coerce.number())
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: "Alice" } });
        fireEvent.change(ageInput, { target: { value: "30" } });
        fireEvent.click(getByText("Submit"));
      });

      await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
      expect(onFinish).toHaveBeenCalledWith({ name: "Alice", age: 30 });
    });
  });
});
