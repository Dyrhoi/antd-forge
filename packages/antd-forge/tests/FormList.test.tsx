import { describe, expect, it, vi } from "vitest";
import { useForm } from "../src/useForm";
import z from "zod";
import { Flex, Input } from "antd";
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
});
