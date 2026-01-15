import {
  act,
  renderHook,
  render,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import z from "zod";
import { useForm, defaultEmptyValuesToUndefined } from "../src";
import { Input, InputNumber } from "antd";
import { useState } from "react";

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

  describe("useForm-focus-retention", () => {
    const schema = z.object({ search: z.string().optional() });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("maintains focus on input when parent re-renders after submit", async () => {
      const onFinish = vi.fn();

      function Comp() {
        const [submitCount, setSubmitCount] = useState(0);
        const { Form, FormItem } = useForm({
          validator: schema,
          onFinish: (values) => {
            onFinish(values);
            setSubmitCount((c) => c + 1);
          },
          autoSubmit: "auto",
        });

        return (
          <div>
            <span data-testid="submit-count">{submitCount}</span>
            <Form>
              <FormItem name={["search"]}>
                <Input data-testid="search-input" />
              </FormItem>
            </Form>
          </div>
        );
      }

      const { getByTestId } = render(<Comp />);
      const input = getByTestId("search-input");

      // Focus the input
      await act(async () => {
        input.focus();
      });
      expect(document.activeElement).toBe(input);

      // Type something - this triggers auto-submit which causes parent state change
      await act(async () => {
        fireEvent.change(input, { target: { value: "test" } });
      });

      // Leading edge fires immediately, causing state update
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(getByTestId("submit-count").textContent).toBe("1");

      // Wait for any async React updates to settle
      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      // Focus should still be on the input after the re-render
      expect(document.activeElement).toBe(input);
    });

    it("maintains focus during rapid typing with debounced auto-submit", async () => {
      const onFinish = vi.fn();

      function Comp() {
        const [lastValue, setLastValue] = useState("");
        const { Form, FormItem } = useForm({
          validator: schema,
          onFinish: (values) => {
            onFinish(values);
            setLastValue(values.search ?? "");
          },
          autoSubmit: { mode: "auto", debounce: 300 },
        });

        return (
          <div>
            <span data-testid="last-value">{lastValue}</span>
            <Form>
              <FormItem name={["search"]}>
                <Input data-testid="search-input" />
              </FormItem>
            </Form>
          </div>
        );
      }

      const { getByTestId } = render(<Comp />);
      const input = getByTestId("search-input");

      // Focus the input
      await act(async () => {
        input.focus();
      });
      expect(document.activeElement).toBe(input);

      // Simulate typing character by character
      await act(async () => {
        fireEvent.change(input, { target: { value: "t" } });
      });
      expect(document.activeElement).toBe(input);

      // Leading edge fires, state updates
      expect(onFinish).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(100);
        fireEvent.change(input, { target: { value: "te" } });
      });
      expect(document.activeElement).toBe(input);

      await act(async () => {
        vi.advanceTimersByTime(100);
        fireEvent.change(input, { target: { value: "tes" } });
      });
      expect(document.activeElement).toBe(input);

      await act(async () => {
        vi.advanceTimersByTime(100);
        fireEvent.change(input, { target: { value: "test" } });
      });
      expect(document.activeElement).toBe(input);

      // Let debounce complete - trailing edge fires
      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      // Focus should still be on the input
      expect(document.activeElement).toBe(input);
      // Should have called onFinish for trailing edge with new value
      expect(onFinish).toHaveBeenLastCalledWith({ search: "test" });
    });
  });

  describe("normalizeValue", () => {
    const schema = z.object({
      username: z.string(),
      age: z.coerce.number(),
      bio: z.string().optional(),
    });

    it("calls normalizeValue for each field change", async () => {
      const normalizeValue = vi.fn((params) => params.value);

      function Comp() {
        const { Form, FormItem } = useForm({
          validator: schema,
          normalizeValue,
        });

        return (
          <Form>
            <FormItem name={["username"]}>
              <Input data-testid="username" />
            </FormItem>
            <FormItem name={["age"]}>
              <Input data-testid="age" />
            </FormItem>
          </Form>
        );
      }

      const { getByTestId } = render(<Comp />);

      await act(async () => {
        fireEvent.change(getByTestId("username"), {
          target: { value: "alice" },
        });
      });

      expect(normalizeValue).toHaveBeenCalled();
      const lastCall = normalizeValue.mock.calls.at(-1)?.[0];
      expect(lastCall.name).toEqual(["username"]);
      expect(lastCall.value).toBe("alice");
    });

    it("match returns true for matching path and false otherwise", async () => {
      const matchResults: boolean[] = [];

      function Comp() {
        const { Form, FormItem } = useForm({
          validator: schema,
          normalizeValue: (params) => {
            matchResults.push(params.match(["username"]));
            matchResults.push(params.match(["age"]));
            return params.value;
          },
        });

        return (
          <Form>
            <FormItem name={["username"]}>
              <Input data-testid="username" />
            </FormItem>
          </Form>
        );
      }

      const { getByTestId } = render(<Comp />);

      await act(async () => {
        fireEvent.change(getByTestId("username"), {
          target: { value: "alice" },
        });
      });

      // First match (username) should be true, second match (age) should be false
      expect(matchResults).toContain(true);
      expect(matchResults).toContain(false);
    });

    it("transforms values based on field path", async () => {
      const onFinish = vi.fn();

      function Comp() {
        const { Form, FormItem } = useForm({
          validator: schema,
          onFinish,
          normalizeValue: (params) => {
            if (params.match(["username"])) {
              return params.value.trim().toLowerCase();
            }
            return params.value;
          },
        });

        return (
          <Form>
            <FormItem name={["username"]}>
              <Input data-testid="username" />
            </FormItem>
            <FormItem name={["age"]}>
              <Input data-testid="age" />
            </FormItem>
            <button type="submit">Submit</button>
          </Form>
        );
      }

      const { getByTestId, getByText } = render(<Comp />);

      await act(async () => {
        fireEvent.change(getByTestId("username"), {
          target: { value: "  ALICE  " },
        });
        fireEvent.change(getByTestId("age"), { target: { value: "25" } });
        fireEvent.click(getByText("Submit"));
      });

      await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
      expect(onFinish).toHaveBeenCalledWith({
        username: "alice",
        age: 25,
      });
    });

    it("converts empty strings to undefined when using defaultEmptyValuesToUndefined", async () => {
      const onFinish = vi.fn();

      // Schema with optional bio field
      const optionalSchema = z.object({
        username: z.string(),
        bio: z.string().optional(),
      });

      function Comp() {
        const { Form, FormItem } = useForm({
          validator: optionalSchema,
          onFinish,
          normalizeValue: defaultEmptyValuesToUndefined,
        });

        return (
          <Form>
            <FormItem name={["username"]}>
              <Input data-testid="username" />
            </FormItem>
            <FormItem name={["bio"]}>
              <Input data-testid="bio" />
            </FormItem>
            <button type="submit">Submit</button>
          </Form>
        );
      }

      const { getByTestId, getByText } = render(<Comp />);

      await act(async () => {
        fireEvent.change(getByTestId("username"), {
          target: { value: "alice" },
        });
        // bio left empty - should become undefined via normalizeValue
        fireEvent.change(getByTestId("bio"), { target: { value: "" } });
        fireEvent.click(getByText("Submit"));
      });

      await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
      expect(onFinish).toHaveBeenCalledWith({
        username: "alice",
        bio: undefined,
      });
    });

    it("per-item normalize prop takes precedence over global normalizeValue", async () => {
      const globalNormalize = vi.fn((params) => params.value + "_global");
      const itemNormalize = vi.fn((value: string) => value + "_item");

      function Comp() {
        const { Form, FormItem } = useForm({
          validator: schema,
          normalizeValue: globalNormalize,
        });

        return (
          <Form>
            <FormItem name={["username"]} normalize={itemNormalize}>
              <Input data-testid="username" />
            </FormItem>
            <FormItem name={["bio"]}>
              <Input data-testid="bio" />
            </FormItem>
          </Form>
        );
      }

      const { getByTestId } = render(<Comp />);

      await act(async () => {
        fireEvent.change(getByTestId("username"), {
          target: { value: "alice" },
        });
        fireEvent.change(getByTestId("bio"), { target: { value: "hello" } });
      });

      // username uses item normalize, not global
      // antd's normalize receives (value, prevValue, allValues)
      expect(itemNormalize).toHaveBeenCalled();
      expect(itemNormalize.mock.calls[0]?.[0]).toBe("alice");
      // bio uses global normalize
      expect(globalNormalize).toHaveBeenCalled();
    });

    it("does not normalize when normalizeValue is not provided", async () => {
      const onFinish = vi.fn();

      // Use a schema that accepts empty string
      const flexibleSchema = z.object({
        username: z.string(), // accepts empty string
      });

      function Comp() {
        const { Form, FormItem } = useForm({
          validator: flexibleSchema,
          onFinish,
          // no normalizeValue
        });

        return (
          <Form>
            <FormItem name={["username"]}>
              <Input data-testid="username" />
            </FormItem>
            <button type="submit">Submit</button>
          </Form>
        );
      }

      const { getByTestId, getByText } = render(<Comp />);

      await act(async () => {
        // Type something first, then clear to empty string
        fireEvent.change(getByTestId("username"), {
          target: { value: "test" },
        });
        fireEvent.change(getByTestId("username"), { target: { value: "" } });
        fireEvent.click(getByText("Submit"));
      });

      await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
      // Empty string passed through without normalization (not converted to undefined)
      expect(onFinish).toHaveBeenCalledWith({
        username: "",
      });
    });
  });
});
