import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { Input } from "antd";
import { describe, expect, it, vi } from "vitest";
import z from "zod";
import { useForm } from "../src";
import { useFormInstance } from "../src/useFormInstance";

describe("useFormInstance", () => {
  it("mode=inherit prefixes nested FormItem names at runtime", async () => {
    const addressSchema = z.object({ street: z.string() });
    const userSchema = z.object({ address: addressSchema });

    type AddressForm = z.infer<typeof addressSchema>;

    const onFinish = vi.fn();

    function AddressFormFields() {
      const { FormItem } = useFormInstance<AddressForm>({ mode: "inherit" });

      return (
        <FormItem name={["street"]}>
          <Input data-testid="street-input" />
        </FormItem>
      );
    }

    function Comp() {
      const { Form, FormItem } = useForm({ validator: userSchema, onFinish });

      return (
        <Form>
          <FormItem name={["address"]}>
            <AddressFormFields />
          </FormItem>

          <button type="submit">Submit</button>
        </Form>
      );
    }

    const { container, getByText } = render(<Comp />);

    const input = container.querySelector(
      'input[data-testid="street-input"]',
    ) as HTMLInputElement | null;

    expect(input).not.toBeNull();

    await act(async () => {
      fireEvent.change(input!, { target: { value: "Main St" } });
      fireEvent.click(getByText("Submit"));
    });

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(onFinish).toHaveBeenCalledWith({ address: { street: "Main St" } });
  });
});
