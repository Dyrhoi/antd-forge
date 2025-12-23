import {
  act,
  renderHook,
  render,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import z from "zod";
import { useForm } from "../src";
import { Input, InputNumber } from "antd";

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
        const { Form, FormItem } = useForm({
          validator: schema,
          onFinish,
        });

        return (
          <Form>
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

    it("shows field errors when invalid value is entered (age as non-number)", async () => {
      const onFinish = vi.fn();

      // create the hook first so we can inspect the returned form instance
      const { result } = renderHook(() =>
        useForm({ validator: schema, onFinish }),
      );

      function Comp() {
        const { Form, FormItem } = result.current;
        return (
          <Form>
            <FormItem name={["name"]}>
              <Input />
            </FormItem>
            <FormItem name={["age"]}>
              <Input />
            </FormItem>
            <button type="submit">Submit</button>
          </Form>
        );
      }

      const { container, getByText } = render(<Comp />);

      const inputs = container.querySelectorAll("input");
      const nameInput = inputs[0]! as HTMLInputElement;
      const ageInput = inputs[1]! as HTMLInputElement;

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: "Bob" } });
        fireEvent.change(ageInput, { target: { value: "not a number" } });
        fireEvent.click(getByText("Submit"));
      });

      // wait for validation to run and then assert the form has field errors
      await waitFor(() => {
        const errors = result.current.form.getFieldsError();
        const hasErrors = errors.some(
          (e) => Array.isArray(e.errors) && e.errors.length > 0,
        );
        expect(hasErrors).toBe(true);
      });

      expect(onFinish).toHaveBeenCalledTimes(0);
    });
  });

  describe("useForm-autoSubmit", () => {
    const schema = z.object({ search: z.string() });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("does not auto-submit when autoSubmit is 'off' (default)", async () => {
      const onFinish = vi.fn();

      function Comp() {
        const { Form, FormItem } = useForm({
          validator: schema,
          onFinish,
          autoSubmit: "off",
        });

        return (
          <Form>
            <FormItem name={["search"]}>
              <Input data-testid="search-input" />
            </FormItem>
          </Form>
        );
      }

      const { getByTestId } = render(<Comp />);
      const input = getByTestId("search-input");

      await act(async () => {
        fireEvent.change(input, { target: { value: "test query" } });
      });

      // Advance timers past debounce
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(onFinish).not.toHaveBeenCalled();
    });

    it("auto-submits immediately on first change with leading+trailing debounce", async () => {
      const onFinish = vi.fn();

      function Comp() {
        const { Form, FormItem } = useForm({
          validator: schema,
          onFinish,
          autoSubmit: "auto",
        });

        return (
          <Form>
            <FormItem name={["search"]}>
              <Input data-testid="search-input" />
            </FormItem>
          </Form>
        );
      }

      const { getByTestId } = render(<Comp />);
      const input = getByTestId("search-input");

      await act(async () => {
        fireEvent.change(input, { target: { value: "test query" } });
      });

      // Should have called immediately (leading edge)
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(onFinish).toHaveBeenCalledWith({ search: "test query" });

      // Advance past debounce - no trailing call since value hasn't changed
      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      // Still only 1 call (no duplicate for same value)
      expect(onFinish).toHaveBeenCalledTimes(1);
    });

    it("respects custom debounce timing for trailing edge", async () => {
      const onFinish = vi.fn();

      function Comp() {
        const { Form, FormItem } = useForm({
          validator: schema,
          onFinish,
          autoSubmit: { mode: "auto", debounce: 500 },
        });

        return (
          <Form>
            <FormItem name={["search"]}>
              <Input data-testid="search-input" />
            </FormItem>
          </Form>
        );
      }

      const { getByTestId } = render(<Comp />);
      const input = getByTestId("search-input");

      // First change fires immediately (leading edge)
      await act(async () => {
        fireEvent.change(input, { target: { value: "first" } });
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(onFinish).toHaveBeenCalledWith({ search: "first" });

      // Second change during debounce period
      await act(async () => {
        vi.advanceTimersByTime(200);
        fireEvent.change(input, { target: { value: "second" } });
      });

      // Still only 1 call (waiting for trailing edge)
      expect(onFinish).toHaveBeenCalledTimes(1);

      // At 300ms from second change - not yet (custom 500ms debounce)
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(onFinish).toHaveBeenCalledTimes(1);

      // At 500ms from second change - trailing edge fires
      await act(async () => {
        vi.advanceTimersByTime(250);
      });
      expect(onFinish).toHaveBeenCalledTimes(2);
      expect(onFinish).toHaveBeenLastCalledWith({ search: "second" });
    });

    it("fires immediately on first change (leading edge) for instant controls", async () => {
      const onFinish = vi.fn();

      function Comp() {
        const { Form, FormItem } = useForm({
          validator: schema,
          onFinish,
          autoSubmit: "auto",
        });

        return (
          <Form>
            <FormItem name={["search"]}>
              <Input data-testid="search-input" />
            </FormItem>
          </Form>
        );
      }

      const { getByTestId } = render(<Comp />);
      const input = getByTestId("search-input");

      // First change should fire immediately (leading edge)
      await act(async () => {
        fireEvent.change(input, { target: { value: "instant" } });
      });

      // Should have called immediately - no waiting for debounce
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(onFinish).toHaveBeenCalledWith({ search: "instant" });
    });

    it("debounces rapid changes but fires at leading and trailing edges", async () => {
      const onFinish = vi.fn();

      function Comp() {
        const { Form, FormItem } = useForm({
          validator: schema,
          onFinish,
          autoSubmit: "auto",
        });

        return (
          <Form>
            <FormItem name={["search"]}>
              <Input data-testid="search-input" />
            </FormItem>
          </Form>
        );
      }

      const { getByTestId } = render(<Comp />);
      const input = getByTestId("search-input");

      // First change fires immediately (leading edge)
      await act(async () => {
        fireEvent.change(input, { target: { value: "t" } });
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(onFinish).toHaveBeenCalledWith({ search: "t" });

      // Rapid typing - these should be debounced
      await act(async () => {
        vi.advanceTimersByTime(100);
        fireEvent.change(input, { target: { value: "te" } });
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
        fireEvent.change(input, { target: { value: "tes" } });
      });
      await act(async () => {
        vi.advanceTimersByTime(100);
        fireEvent.change(input, { target: { value: "test" } });
      });

      // Still only the leading edge call
      expect(onFinish).toHaveBeenCalledTimes(1);

      // Advance past debounce - trailing edge should fire with final value
      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      // Leading + trailing = 2 calls
      expect(onFinish).toHaveBeenCalledTimes(2);
      expect(onFinish).toHaveBeenLastCalledWith({ search: "test" });
    });

    it("validates with schema before auto-submit", async () => {
      const strictSchema = z.object({ search: z.string().min(3) });
      const onFinish = vi.fn();

      function Comp() {
        const { Form, FormItem } = useForm({
          validator: strictSchema,
          onFinish,
          autoSubmit: "auto",
        });

        return (
          <Form>
            <FormItem name={["search"]}>
              <Input data-testid="search-input" />
            </FormItem>
          </Form>
        );
      }

      const { getByTestId } = render(<Comp />);
      const input = getByTestId("search-input");

      // Type value that's too short
      await act(async () => {
        fireEvent.change(input, { target: { value: "ab" } });
      });

      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      // onFinish should NOT have been called (validation failed)
      expect(onFinish).not.toHaveBeenCalled();

      // Now type valid value
      await act(async () => {
        fireEvent.change(input, { target: { value: "valid search" } });
      });

      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(onFinish).toHaveBeenCalledWith({ search: "valid search" });
    });
  });
});
