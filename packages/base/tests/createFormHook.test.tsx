import {
  act,
  render,
  fireEvent,
  waitFor,
  renderHook,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createFormHook } from "../src";
import { Input, InputNumber } from "antd";

describe("createFormHook", () => {
  // Simple schema for basic tests
  const simpleSchema = z.object({
    name: z.string(),
    age: z.coerce.number(),
  });

  // Schema with nested object for inheritAt tests
  const nestedSchema = z.object({
    name: z.string(),
    age: z.coerce.number(),
    address: z.object({
      street: z.string(),
      city: z.string(),
    }),
  });

  describe("useCustomForm", () => {
    it("creates a form hook with pre-configured validator", async () => {
      const { useCustomForm } = createFormHook({ validator: simpleSchema });
      const onFinish = vi.fn();

      function TestForm() {
        const { Form, FormItem } = useCustomForm({ onFinish });

        return (
          <Form>
            <FormItem name="name">
              <Input data-testid="name" />
            </FormItem>
            <FormItem name="age">
              <InputNumber data-testid="age" />
            </FormItem>
            <button type="submit">Submit</button>
          </Form>
        );
      }

      const { getByTestId, getByText } = render(<TestForm />);

      await act(async () => {
        fireEvent.change(getByTestId("name"), { target: { value: "Alice" } });
        fireEvent.change(getByTestId("age"), { target: { value: "25" } });
        fireEvent.click(getByText("Submit"));
      });

      await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
      expect(onFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Alice",
          age: 25,
        }),
      );
    });

    it("validates using the pre-configured schema and shows errors", async () => {
      const strictSchema = z.object({
        name: z.string().min(3, "Name must be at least 3 characters"),
        age: z.number(),
      });
      const { useCustomForm } = createFormHook({ validator: strictSchema });
      const onFinish = vi.fn();

      const { result } = renderHook(() => useCustomForm({ onFinish }));

      function TestForm() {
        const { Form, FormItem } = result.current;
        return (
          <Form>
            <FormItem name="name">
              <Input data-testid="name" />
            </FormItem>
            <FormItem name="age">
              <InputNumber data-testid="age" />
            </FormItem>
            <button type="submit">Submit</button>
          </Form>
        );
      }

      const { getByTestId, getByText } = render(<TestForm />);

      await act(async () => {
        // Set invalid value (name too short)
        fireEvent.change(getByTestId("name"), { target: { value: "AB" } });
        fireEvent.change(getByTestId("age"), { target: { value: "25" } });
        fireEvent.click(getByText("Submit"));
      });

      await waitFor(() => {
        // Check that form has field errors
        const errors = result.current.form.getFieldsError();
        const hasErrors = errors.some((e) => e.errors.length > 0);
        expect(hasErrors).toBe(true);
      });

      // onFinish should not be called due to validation errors
      expect(onFinish).not.toHaveBeenCalled();
    });
  });

  describe("useCustomFormInstance", () => {
    it("accesses form from within the tree without inheritAt", async () => {
      const { useCustomForm, useCustomFormInstance } = createFormHook({
        validator: simpleSchema,
      });

      function NameField() {
        const { FormItem } = useCustomFormInstance();
        return (
          <FormItem name="name">
            <Input data-testid="name" />
          </FormItem>
        );
      }

      function TestForm() {
        const { Form } = useCustomForm();
        return (
          <Form>
            <NameField />
            <button type="submit">Submit</button>
          </Form>
        );
      }

      const { getByTestId } = render(<TestForm />);

      await act(async () => {
        fireEvent.change(getByTestId("name"), { target: { value: "Bob" } });
      });

      // Field should be rendered and editable
      expect((getByTestId("name") as HTMLInputElement).value).toBe("Bob");
    });

    it("scopes form access with inheritAt path", async () => {
      const { useCustomForm, useCustomFormInstance } = createFormHook({
        validator: nestedSchema,
      });
      const onFinish = vi.fn();

      function AddressFields() {
        // inheritAt narrows type to the address object
        const { FormItem } = useCustomFormInstance({
          inheritAt: ["address"],
        });

        return (
          <>
            <FormItem name="street">
              <Input data-testid="street" />
            </FormItem>
            <FormItem name="city">
              <Input data-testid="city" />
            </FormItem>
          </>
        );
      }

      function TestForm() {
        const { Form, FormItem } = useCustomForm({ onFinish });

        return (
          <Form>
            <FormItem name="name">
              <Input data-testid="name" />
            </FormItem>
            <FormItem name="age">
              <InputNumber data-testid="age" />
            </FormItem>
            <AddressFields />
            <button type="submit">Submit</button>
          </Form>
        );
      }

      const { getByTestId, getByText } = render(<TestForm />);

      await act(async () => {
        fireEvent.change(getByTestId("name"), { target: { value: "Charlie" } });
        fireEvent.change(getByTestId("age"), { target: { value: "30" } });
        fireEvent.change(getByTestId("street"), {
          target: { value: "123 Main St" },
        });
        fireEvent.change(getByTestId("city"), {
          target: { value: "Springfield" },
        });
        fireEvent.click(getByText("Submit"));
      });

      await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
      expect(onFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Charlie",
          age: 30,
          address: {
            street: "123 Main St",
            city: "Springfield",
          },
        }),
      );
    });

    it("useWatch works with useCustomFormInstance", async () => {
      const { useCustomForm, useCustomFormInstance } = createFormHook({
        validator: simpleSchema,
      });

      function WatchedName() {
        const { useWatch } = useCustomFormInstance();
        const name = useWatch("name");
        return <span data-testid="watched">{name ?? "empty"}</span>;
      }

      function TestForm() {
        const { Form, FormItem } = useCustomForm();

        return (
          <Form>
            <FormItem name="name">
              <Input data-testid="name" />
            </FormItem>
            <WatchedName />
          </Form>
        );
      }

      const { getByTestId } = render(<TestForm />);

      expect(getByTestId("watched").textContent).toBe("empty");

      await act(async () => {
        fireEvent.change(getByTestId("name"), { target: { value: "David" } });
      });

      await waitFor(() => {
        expect(getByTestId("watched").textContent).toBe("David");
      });
    });
  });
});
