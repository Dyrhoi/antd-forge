import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { createFormHook } from "../src";

describe("createFormHook types", () => {
  const userSchema = z.object({
    name: z.string(),
    age: z.number(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      zip: z.number(),
    }),
    tags: z.array(z.string()),
  });

  type UserValues = z.infer<typeof userSchema>;

  describe("useCustomForm", () => {
    it("infers correct form values type from schema", () => {
      const { useCustomForm } = createFormHook({ validator: userSchema });

      // The return type should be UseFormReturn<UserValues>
      const result = useCustomForm();

      expectTypeOf(result.form.getFieldsValue).returns.toMatchTypeOf<
        Partial<UserValues>
      >();
    });

    it("FormItem name prop accepts valid paths", () => {
      const { useCustomForm } = createFormHook({ validator: userSchema });
      const { FormItem } = useCustomForm();

      // Valid paths should be accepted
      expectTypeOf(FormItem).parameter(0).toHaveProperty("name");

      // This is a compile-time check - the test passes if it compiles
      <FormItem name="name" />;
      <FormItem name="age" />;
      <FormItem name={["address", "street"]} />;
      <FormItem name={["address", "city"]} />;
      <FormItem name={["tags", 0]} />;
    });
  });

  describe("useCustomFormInstance", () => {
    it("returns full schema type without inheritAt", () => {
      const { useCustomForm, useCustomFormInstance } = createFormHook({
        validator: userSchema,
      });

      // Simulate being inside a form
      useCustomForm();
      const { FormItem } = useCustomFormInstance();

      // FormItem should accept all paths from the full schema
      <FormItem name="name" />;
      <FormItem name={["address", "street"]} />;
    });

    it("narrows type when inheritAt is provided", () => {
      const { useCustomForm, useCustomFormInstance } = createFormHook({
        validator: userSchema,
      });

      useCustomForm();
      const { FormItem } = useCustomFormInstance({ inheritAt: ["address"] });

      // FormItem should only accept paths within address
      <FormItem name="street" />;
      <FormItem name="city" />;
      <FormItem name="zip" />;

      // @ts-expect-error - "name" is not a valid path within address
      <FormItem name="name" />;

      // @ts-expect-error - "age" is not a valid path within address
      <FormItem name="age" />;
    });

    it("handles nested array paths with inheritAt", () => {
      const formWithList = z.object({
        users: z.array(
          z.object({
            name: z.string(),
            email: z.string(),
          }),
        ),
      });

      const { useCustomForm, useCustomFormInstance } = createFormHook({
        validator: formWithList,
      });

      useCustomForm();
      // inheritAt to a specific array item
      const { FormItem } = useCustomFormInstance({ inheritAt: ["users", 0] });

      // Should accept fields of the array item
      <FormItem name="name" />;
      <FormItem name="email" />;

      // @ts-expect-error - "users" is not valid within users[0]
      <FormItem name="users" />;
    });
  });
});
