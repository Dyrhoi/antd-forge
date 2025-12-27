import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { Checkbox, Input, InputNumber } from "antd";
import { describe, expect, it, vi } from "vitest";
import z from "zod";
import { useForm } from "../src";
import { useFormInstance } from "../src/useFormInstance";

describe("useFormInstance", () => {
  it("inherit mode: FormItem inherits prefix from parent FormItem", async () => {
    const addressSchema = z.object({ street: z.string() });
    const userSchema = z.object({ address: addressSchema });

    type AddressForm = z.infer<typeof addressSchema>;

    const onFinish = vi.fn();

    // Composable component using inherit mode
    function AddressFormFields() {
      const { FormItem } = useFormInstance<AddressForm>({ inherit: true });

      // Relative path - will be prefixed with ["address"]
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
          {/* Parent FormItem sets prefix ["address"] for children */}
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

  it("FormList provides index for full path construction", async () => {
    const schema = z.object({
      users: z.array(
        z.object({
          name: z.string(),
          age: z.number(),
        }),
      ),
    });

    const onFinish = vi.fn();

    function Comp() {
      const { Form, FormItem, FormList } = useForm({
        validator: schema,
        onFinish,
      });

      return (
        <Form>
          <FormList
            name={["users"]}
            initialValue={[{ name: "Alice", age: 25 }]}
          >
            {(fields, { add }) => (
              <>
                {fields.map(({ key, name: index }) => (
                  <div key={key}>
                    {/* Full paths with index - type safe! */}
                    <FormItem name={["users", index, "name"]}>
                      <Input data-testid={`user-${index}-name`} />
                    </FormItem>
                    <FormItem name={["users", index, "age"]}>
                      <InputNumber data-testid={`user-${index}-age`} />
                    </FormItem>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => add({ name: "", age: 0 })}
                  data-testid="add"
                >
                  Add
                </button>
              </>
            )}
          </FormList>
          <button type="submit">Submit</button>
        </Form>
      );
    }

    const { getByTestId, getByText } = render(<Comp />);

    // Verify initial value
    expect((getByTestId("user-0-name") as HTMLInputElement).value).toBe(
      "Alice",
    );

    // Modify first user
    await act(async () => {
      fireEvent.change(getByTestId("user-0-name"), {
        target: { value: "Bob" },
      });
    });

    // Add second user
    await act(async () => {
      fireEvent.click(getByTestId("add"));
    });

    // Fill second user
    await act(async () => {
      fireEvent.change(getByTestId("user-1-name"), {
        target: { value: "Charlie" },
      });
      fireEvent.change(getByTestId("user-1-age"), { target: { value: "30" } });
    });

    // Submit
    await act(async () => {
      fireEvent.click(getByText("Submit"));
    });

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(onFinish).toHaveBeenCalledWith({
      users: [
        { name: "Bob", age: 25 },
        { name: "Charlie", age: 30 },
      ],
    });
  });

  it("nested FormLists with full paths", async () => {
    const schema = z.object({
      departments: z.array(
        z.object({
          name: z.string(),
          employees: z.array(
            z.object({
              name: z.string(),
            }),
          ),
        }),
      ),
    });

    const onFinish = vi.fn();

    function Comp() {
      const { Form, FormItem, FormList } = useForm({
        validator: schema,
        onFinish,
      });

      return (
        <Form>
          <FormList
            name={["departments"]}
            initialValue={[
              { name: "Engineering", employees: [{ name: "Alice" }] },
            ]}
          >
            {(deptFields) => (
              <>
                {deptFields.map(({ key: deptKey, name: deptIndex }) => (
                  <div key={deptKey}>
                    {/* Full path: ["departments", deptIndex, "name"] */}
                    <FormItem name={["departments", deptIndex, "name"]}>
                      <Input data-testid={`dept-${deptIndex}-name`} />
                    </FormItem>
                    <FormList name={["departments", deptIndex, "employees"]}>
                      {(empFields) => (
                        <>
                          {empFields.map(({ key: empKey, name: empIndex }) => (
                            <div key={empKey}>
                              {/* Full path: ["departments", deptIndex, "employees", empIndex, "name"] */}
                              <FormItem
                                name={[
                                  "departments",
                                  deptIndex,
                                  "employees",
                                  empIndex,
                                  "name",
                                ]}
                              >
                                <Input
                                  data-testid={`dept-${deptIndex}-emp-${empIndex}-name`}
                                />
                              </FormItem>
                            </div>
                          ))}
                        </>
                      )}
                    </FormList>
                  </div>
                ))}
              </>
            )}
          </FormList>
          <button type="submit">Submit</button>
        </Form>
      );
    }

    const { getByTestId, getByText } = render(<Comp />);

    // Verify initial values
    expect((getByTestId("dept-0-name") as HTMLInputElement).value).toBe(
      "Engineering",
    );
    expect((getByTestId("dept-0-emp-0-name") as HTMLInputElement).value).toBe(
      "Alice",
    );

    // Modify nested value
    await act(async () => {
      fireEvent.change(getByTestId("dept-0-emp-0-name"), {
        target: { value: "Bob" },
      });
    });

    // Submit
    await act(async () => {
      fireEvent.click(getByText("Submit"));
    });

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(onFinish).toHaveBeenCalledWith({
      departments: [{ name: "Engineering", employees: [{ name: "Bob" }] }],
    });
  });

  it("inherit mode: useFormInstance works with nested FormItem prefix", async () => {
    const schema = z.object({
      items: z.array(
        z.object({
          title: z.string(),
          details: z.object({
            description: z.string(),
          }),
        }),
      ),
    });

    type ItemDetails = { description: string };

    const onFinish = vi.fn();

    // Reusable component using inherit mode
    function ItemDetailsFields() {
      const { FormItem } = useFormInstance<ItemDetails>({ inherit: true });
      // Relative path - will be prefixed with parent FormItem's path
      return (
        <FormItem name={["description"]}>
          <Input data-testid="description" />
        </FormItem>
      );
    }

    function Comp() {
      const { Form, FormItem, FormList } = useForm({
        validator: schema,
        onFinish,
      });

      return (
        <Form>
          <FormList
            name={["items"]}
            initialValue={[{ title: "", details: { description: "" } }]}
          >
            {(fields) => (
              <>
                {fields.map(({ key, name: index }) => (
                  <div key={key}>
                    <FormItem name={["items", index, "title"]}>
                      <Input data-testid={`item-${index}-title`} />
                    </FormItem>
                    {/* This FormItem sets prefix for ItemDetailsFields */}
                    <FormItem name={["items", index, "details"]}>
                      <ItemDetailsFields />
                    </FormItem>
                  </div>
                ))}
              </>
            )}
          </FormList>
          <button type="submit">Submit</button>
        </Form>
      );
    }

    const { getByTestId, getByText } = render(<Comp />);

    // Fill in values
    await act(async () => {
      fireEvent.change(getByTestId("item-0-title"), {
        target: { value: "My Item" },
      });
      fireEvent.change(getByTestId("description"), {
        target: { value: "A great item" },
      });
    });

    // Submit
    await act(async () => {
      fireEvent.click(getByText("Submit"));
    });

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(onFinish).toHaveBeenCalledWith({
      items: [
        {
          title: "My Item",
          details: { description: "A great item" },
        },
      ],
    });
  });

  it("FormList with nested objects initializes values correctly", async () => {
    const schema = z.object({
      departments: z.array(
        z.object({
          name: z.string(),
          team: z.object({
            teamName: z.string(),
          }),
        }),
      ),
    });

    const onFinish = vi.fn();

    function Comp() {
      const { Form, FormItem, FormList } = useForm({
        validator: schema,
        onFinish,
      });

      return (
        <Form>
          <FormList
            name={["departments"]}
            initialValue={[
              { name: "Engineering", team: { teamName: "Frontend" } },
            ]}
          >
            {(fields) => (
              <>
                {fields.map(({ key, name: index }) => (
                  <div key={key}>
                    <FormItem name={["departments", index, "name"]}>
                      <Input data-testid={`dept-${index}-name`} />
                    </FormItem>
                    <FormItem name={["departments", index, "team", "teamName"]}>
                      <Input data-testid={`dept-${index}-team-name`} />
                    </FormItem>
                  </div>
                ))}
              </>
            )}
          </FormList>
          <button type="submit">Submit</button>
        </Form>
      );
    }

    const { getByTestId, getByText } = render(<Comp />);

    // Verify initial values (no waitFor needed - should be immediate)
    expect((getByTestId("dept-0-name") as HTMLInputElement).value).toBe(
      "Engineering",
    );
    expect((getByTestId("dept-0-team-name") as HTMLInputElement).value).toBe(
      "Frontend",
    );

    // Submit
    await act(async () => {
      fireEvent.click(getByText("Submit"));
    });

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(onFinish).toHaveBeenCalledWith({
      departments: [{ name: "Engineering", team: { teamName: "Frontend" } }],
    });
  });

  it("FormList inside inherited form with inherit mode", async () => {
    // Simplified test to isolate inherit + FormList issue
    const schema = z.object({
      wrapper: z.object({
        items: z.array(z.object({ name: z.string() })),
      }),
    });

    type WrapperContent = { items: { name: string }[] };

    const onFinish = vi.fn();

    // Component using inherit mode with FormList
    function WrapperFields() {
      const { FormItem, FormList } = useFormInstance<WrapperContent>({
        inherit: true,
      });
      return (
        <>
          <FormList name={["items"]} initialValue={[{ name: "Item 1" }]}>
            {(fields) => (
              <>
                {fields.map(({ key, name: index }) => (
                  <div key={key}>
                    <FormItem name={["items", index, "name"]}>
                      <Input data-testid={`item-${index}-name`} />
                    </FormItem>
                  </div>
                ))}
              </>
            )}
          </FormList>
        </>
      );
    }

    function Comp() {
      const { Form, FormItem } = useForm({
        validator: schema,
        onFinish,
      });

      return (
        <Form>
          {/* Parent FormItem sets prefix ["wrapper"] */}
          <FormItem name={["wrapper"]}>
            <WrapperFields />
          </FormItem>
          <button type="submit">Submit</button>
        </Form>
      );
    }

    const { getByTestId, getByText } = render(<Comp />);

    // Wait for FormList initial value to be set
    await waitFor(() => {
      expect((getByTestId("item-0-name") as HTMLInputElement).value).toBe(
        "Item 1",
      );
    });

    // Submit
    await act(async () => {
      fireEvent.click(getByText("Submit"));
    });

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(onFinish).toHaveBeenCalledWith({
      wrapper: { items: [{ name: "Item 1" }] },
    });
  });

  it("complex nested form: FormList inside inherited forms and vice versa", async () => {
    // Simplified version to isolate the issue
    const schema = z.object({
      companyName: z.string(),
      departments: z.array(
        z.object({
          deptName: z.string(),
          budget: z.number(),
        }),
      ),
    });

    const onFinish = vi.fn();

    function Comp() {
      const { Form, FormItem, FormList } = useForm({
        validator: schema,
        onFinish,
      });

      return (
        <Form>
          <FormItem name={["companyName"]}>
            <Input data-testid="company-name" />
          </FormItem>

          <FormList
            name={["departments"]}
            initialValue={[
              {
                deptName: "Engineering",
                budget: 100000,
              },
            ]}
          >
            {(deptFields, { add: addDept }) => (
              <>
                {deptFields.map(({ key, name: deptIndex }) => (
                  <div key={key} data-testid={`dept-${deptIndex}`}>
                    <FormItem name={["departments", deptIndex, "deptName"]}>
                      <Input data-testid={`dept-${deptIndex}-name`} />
                    </FormItem>
                    <FormItem name={["departments", deptIndex, "budget"]}>
                      <InputNumber data-testid={`dept-${deptIndex}-budget`} />
                    </FormItem>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    addDept({
                      deptName: "",
                      budget: 0,
                    })
                  }
                  data-testid="add-dept"
                >
                  Add Department
                </button>
              </>
            )}
          </FormList>

          <button type="submit">Submit</button>
        </Form>
      );
    }

    const { getByTestId, getByText } = render(<Comp />);

    // Verify initial state
    expect((getByTestId("dept-0-name") as HTMLInputElement).value).toBe(
      "Engineering",
    );

    // Fill company name
    await act(async () => {
      fireEvent.change(getByTestId("company-name"), {
        target: { value: "Acme Corp" },
      });
    });

    // Add a second department
    await act(async () => {
      fireEvent.click(getByTestId("add-dept"));
    });

    // Fill second department
    await act(async () => {
      fireEvent.change(getByTestId("dept-1-name"), {
        target: { value: "Marketing" },
      });
      fireEvent.change(getByTestId("dept-1-budget"), {
        target: { value: "50000" },
      });
    });

    // Submit
    await act(async () => {
      fireEvent.click(getByText("Submit"));
    });

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(onFinish).toHaveBeenCalledWith({
      companyName: "Acme Corp",
      departments: [
        {
          deptName: "Engineering",
          budget: 100000,
        },
        {
          deptName: "Marketing",
          budget: 50000,
        },
      ],
    });
  });

  it("deeply nested form: FormList inside inherited forms with multiple levels", async () => {
    // Simpler schema - team just has teamName without members array
    const schema = z.object({
      companyName: z.string(),
      departments: z.array(
        z.object({
          deptName: z.string(),
          budget: z.number(),
          team: z.object({
            teamName: z.string(),
          }),
        }),
      ),
    });

    const onFinish = vi.fn();

    // ========================================
    // Main form component
    // ========================================
    function Comp() {
      const { Form, FormItem, FormList } = useForm({
        validator: schema,
        onFinish,
      });

      return (
        <Form>
          <FormItem name={["companyName"]}>
            <Input data-testid="company-name" />
          </FormItem>

          <FormList
            name={["departments"]}
            initialValue={[
              {
                deptName: "Engineering",
                budget: 100000,
                team: {
                  teamName: "Frontend",
                },
              },
            ]}
          >
            {(deptFields) => (
              <>
                {deptFields.map(({ key, name: deptIndex }) => (
                  <div key={key} data-testid={`dept-${deptIndex}`}>
                    <FormItem name={["departments", deptIndex, "deptName"]}>
                      <Input data-testid={`dept-${deptIndex}-name`} />
                    </FormItem>
                    <FormItem name={["departments", deptIndex, "budget"]}>
                      <InputNumber data-testid={`dept-${deptIndex}-budget`} />
                    </FormItem>

                    {/* 4-level nested path: departments -> index -> team -> teamName */}
                    <FormItem
                      name={["departments", deptIndex, "team", "teamName"]}
                    >
                      <Input data-testid={`team-${deptIndex}-name`} />
                    </FormItem>
                  </div>
                ))}
              </>
            )}
          </FormList>

          <button type="submit" data-testid="submit">
            Submit
          </button>
        </Form>
      );
    }

    const { getByTestId } = render(<Comp />);

    // Verify initial state (wait for FormList to initialize)
    await waitFor(() => {
      expect((getByTestId("dept-0-name") as HTMLInputElement).value).toBe(
        "Engineering",
      );
    });

    expect((getByTestId("team-0-name") as HTMLInputElement).value).toBe(
      "Frontend",
    );
    expect((getByTestId("dept-0-budget") as HTMLInputElement).value).toBe(
      "100000",
    );

    // Fill company name
    await act(async () => {
      fireEvent.change(getByTestId("company-name"), {
        target: { value: "Acme Corp" },
      });
    });

    // Submit
    await act(async () => {
      fireEvent.click(getByTestId("submit"));
    });

    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(onFinish).toHaveBeenCalledWith({
      companyName: "Acme Corp",
      departments: [
        {
          deptName: "Engineering",
          budget: 100000,
          team: {
            teamName: "Frontend",
          },
        },
      ],
    });
  });
});
