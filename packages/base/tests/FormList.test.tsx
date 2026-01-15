import { describe, expect, it, vi } from "vitest";
import { useForm } from "../src/useForm";
import z from "zod";
import { Checkbox, Flex, Input } from "antd";
import { act, fireEvent, render, waitFor } from "@testing-library/react";

describe("FormList", () => {
  const schema = z.object({
    address: z.array(
      z.object({ street: z.string(), type: z.enum(["home", "work"]) }),
    ),
  });
  const onFinish = vi.fn();

  it("FormList provides index for full path construction", async () => {
    function Comp() {
      const { Form, FormItem, FormList } = useForm({
        validator: schema,
        onFinish,
      });

      return (
        <Form>
          <FormList
            name={["address"]}
            initialValue={[{ street: "", type: "home" }]}
          >
            {(fields) => (
              <>
                {fields.map(({ key, name: index }) => (
                  <Flex key={key} gap="middle">
                    {/* Full path with index - type safe! */}
                    <FormItem name={["address", index, "street"]}>
                      <Input />
                    </FormItem>
                    <FormItem name={["address", index, "type"]}>
                      <Input />
                    </FormItem>
                  </Flex>
                ))}
              </>
            )}
          </FormList>
          <button type="submit">Submit</button>
        </Form>
      );
    }

    const { container, getByText } = render(<Comp />);

    const inputs = container.querySelectorAll("input");
    const streetAddress = inputs[0]! as HTMLInputElement;
    const typeInput = inputs[1]! as HTMLInputElement;

    await act(async () => {
      fireEvent.change(streetAddress, { target: { value: "Home Address A1" } });
      fireEvent.change(typeInput, { target: { value: "home" } });
      fireEvent.click(getByText("Submit"));
    });

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(onFinish).toHaveBeenCalledWith({
      address: [{ street: "Home Address A1", type: "home" }],
    });
  });

  it("FormList validates nested objects added via add() with initialValue on FormItems", async () => {
    const nestedSchema = z.object({
      emails: z.array(
        z.object({
          email: z.string().email("Invalid email"),
          updates: z.object({
            security: z.boolean(),
            newsletter: z.boolean(),
          }),
        }),
      ),
    });
    const onFinishNested = vi.fn();

    function NestedComp() {
      const { Form, FormItem, FormList } = useForm({
        validator: nestedSchema,
        onFinish: onFinishNested,
      });

      return (
        <Form>
          <FormList name="emails" initialValue={[]}>
            {(fields, { add }) => (
              <>
                {fields.map(({ key, name: index }) => (
                  <Flex key={key} gap="middle">
                    <FormItem name={["emails", index, "email"]}>
                      <Input data-testid={`email-${index}`} />
                    </FormItem>
                    <FormItem
                      name={["emails", index, "updates", "security"]}
                      initialValue={false}
                      valuePropName="checked"
                    >
                      <Checkbox data-testid={`security-${index}`} />
                    </FormItem>
                    <FormItem
                      name={["emails", index, "updates", "newsletter"]}
                      initialValue={false}
                      valuePropName="checked"
                    >
                      <Checkbox data-testid={`newsletter-${index}`} />
                    </FormItem>
                  </Flex>
                ))}
                <button type="button" onClick={() => add()}>
                  Add Email
                </button>
              </>
            )}
          </FormList>
          <button type="submit">Submit</button>
        </Form>
      );
    }

    const { getByText, getByTestId } = render(<NestedComp />);

    // Add an email entry
    await act(async () => {
      fireEvent.click(getByText("Add Email"));
    });

    // Fill in the email
    await act(async () => {
      fireEvent.change(getByTestId("email-0"), {
        target: { value: "test@example.com" },
      });
    });

    // Submit the form
    await act(async () => {
      fireEvent.click(getByText("Submit"));
    });

    // Should succeed with the nested structure from initialValue on FormItems
    await waitFor(() => expect(onFinishNested).toHaveBeenCalledTimes(1));
    expect(onFinishNested).toHaveBeenCalledWith({
      emails: [
        {
          email: "test@example.com",
          updates: {
            security: false,
            newsletter: false,
          },
        },
      ],
    });
  });

  it("FormList add() without default value should still work with FormItem initialValues", async () => {
    // This test reproduces the docs example behavior
    const emailSchema = z.object({
      username: z.string().min(3),
      emails: z
        .array(
          z.object({
            email: z.string().email("Invalid email"),
            updates: z.object({
              security: z.boolean(),
              newsletter: z.boolean(),
            }),
          }),
        )
        .min(1, "At least one email is required"),
    });
    const onFinishEmail = vi.fn();

    function EmailComp() {
      const { Form, FormItem, FormList } = useForm({
        validator: emailSchema,
        onFinish: onFinishEmail,
      });

      return (
        <Form>
          <FormItem name="username">
            <Input data-testid="username" />
          </FormItem>
          <FormList name="emails" initialValue={[]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name: index }) => (
                  <Flex key={key} gap="middle">
                    <FormItem name={["emails", index, "email"]}>
                      <Input data-testid={`email-${index}`} />
                    </FormItem>
                    <FormItem
                      name={["emails", index, "updates", "security"]}
                      initialValue={false}
                      valuePropName="checked"
                    >
                      <Checkbox data-testid={`security-${index}`} />
                    </FormItem>
                    <FormItem
                      name={["emails", index, "updates", "newsletter"]}
                      initialValue={false}
                      valuePropName="checked"
                    >
                      <Checkbox data-testid={`newsletter-${index}`} />
                    </FormItem>
                    <button
                      type="button"
                      data-testid={`remove-${index}`}
                      onClick={() => remove(index)}
                    >
                      Remove
                    </button>
                  </Flex>
                ))}
                {/* add() called WITHOUT default value - like in the docs example */}
                <button type="button" data-testid="add" onClick={() => add()}>
                  Add Email
                </button>
              </>
            )}
          </FormList>
          <button type="submit">Submit</button>
        </Form>
      );
    }

    const { getByText, getByTestId } = render(<EmailComp />);

    // Fill username
    await act(async () => {
      fireEvent.change(getByTestId("username"), {
        target: { value: "testuser" },
      });
    });

    // Add an email entry (without providing default value to add())
    await act(async () => {
      fireEvent.click(getByTestId("add"));
    });

    // Fill in the email field
    await act(async () => {
      fireEvent.change(getByTestId("email-0"), {
        target: { value: "test@example.com" },
      });
    });

    // Submit the form
    await act(async () => {
      fireEvent.click(getByText("Submit"));
    });

    // Should succeed - FormItem initialValues should populate nested structure
    await waitFor(() => expect(onFinishEmail).toHaveBeenCalledTimes(1), {
      timeout: 2000,
    });
    expect(onFinishEmail).toHaveBeenCalledWith({
      username: "testuser",
      emails: [
        {
          email: "test@example.com",
          updates: {
            security: false,
            newsletter: false,
          },
        },
      ],
    });
  });

  it("FormList wrapped in FormItem with same name causes duplicate path (known issue)", async () => {
    // This test documents the issue: wrapping FormList in a FormItem with the same name
    // causes the path to be duplicated (e.g., ["emails", "emails", 0, "email"])
    // The fix is to NOT wrap FormList in a FormItem with the same name
    const emailSchema = z.object({
      username: z.string().min(3),
      emails: z
        .array(
          z.object({
            email: z.string().email("Invalid email"),
            updates: z.object({
              security: z.boolean(),
              newsletter: z.boolean(),
            }),
          }),
        )
        .min(1, "At least one email is required"),
    });
    const onFinishWrapped = vi.fn();

    function WrappedComp() {
      const { Form, FormItem, FormList } = useForm({
        validator: emailSchema,
        onFinish: onFinishWrapped,
      });

      return (
        <Form layout="vertical">
          <FormItem name="username" label="Username">
            <Input data-testid="username" />
          </FormItem>
          {/* BUG: This wrapping pattern causes duplicate paths */}
          <FormItem label="Emails" name="emails">
            <FormList name="emails" initialValue={[]}>
              {(fields, { add }) => (
                <>
                  {fields.map(({ key, name: index }) => (
                    <Flex key={key} gap="middle">
                      <FormItem name={["emails", index, "email"]}>
                        <Input data-testid={`email-${index}`} />
                      </FormItem>
                      <FormItem
                        name={["emails", index, "updates", "security"]}
                        initialValue={false}
                        valuePropName="checked"
                      >
                        <Checkbox data-testid={`security-${index}`} />
                      </FormItem>
                      <FormItem
                        name={["emails", index, "updates", "newsletter"]}
                        initialValue={false}
                        valuePropName="checked"
                      >
                        <Checkbox data-testid={`newsletter-${index}`} />
                      </FormItem>
                    </Flex>
                  ))}
                  <button type="button" data-testid="add" onClick={() => add()}>
                    Add Email
                  </button>
                </>
              )}
            </FormList>
          </FormItem>
          <button type="submit">Submit</button>
        </Form>
      );
    }

    const { getByText, getByTestId, container } = render(<WrappedComp />);

    // Fill username
    await act(async () => {
      fireEvent.change(getByTestId("username"), {
        target: { value: "testuser" },
      });
    });

    // Add an email entry
    await act(async () => {
      fireEvent.click(getByTestId("add"));
    });

    // Fill in the email field
    await act(async () => {
      fireEvent.change(getByTestId("email-0"), {
        target: { value: "test@example.com" },
      });
    });

    // Verify the path is duplicated - field id shows "emails_emails_0_email"
    const emailInput = getByTestId("email-0");
    expect(emailInput.id).toBe("emails_emails_0_email"); // Duplicated path!

    // Submit the form
    await act(async () => {
      fireEvent.click(getByText("Submit"));
    });

    // Wait a bit for any async validation
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // onFinish should NOT have been called due to validation failure from wrong path
    expect(onFinishWrapped).not.toHaveBeenCalled();
  });
});
