import { useForm } from "../src/index";
import { z } from "zod";
import { describe, expectTypeOf, it } from "vitest";
import { FormInstance, FormProps } from "antd";

describe("useForm", () => {
  describe("useForm-schema-driven", () => {
    const schema = z.object({ name: z.string(), age: z.number() });

    it("inferred type should be passed to onFinish callback", () => {
      useForm({
        validator: schema,
        onFinish: (values) => {
          expectTypeOf(values).toEqualTypeOf<z.infer<typeof schema>>();
        },
      });
    });

    it("inferred type should be passed to form return type", () => {
      const { form, formProps } = useForm({
        validator: schema,
      });

      expectTypeOf(form).toEqualTypeOf<FormInstance<z.infer<typeof schema>>>();
      expectTypeOf(formProps).toEqualTypeOf<
        FormProps<z.infer<typeof schema>>
      >();
    });
  });

  describe("useForm-generic", () => {
    type MyFormValues = {
      title: string;
      quantity: number;
    };
    it("inferred type should be passed to onFinish callback", () => {
      useForm<MyFormValues>({
        onFinish: (values) => {
          expectTypeOf(values).toEqualTypeOf<MyFormValues>();
        },
      });
    });

    it("inferred type should be passed to form return type", () => {
      const { form, formProps } = useForm<MyFormValues>();
      expectTypeOf(form).toEqualTypeOf<FormInstance<MyFormValues>>();
      expectTypeOf(formProps).toEqualTypeOf<FormProps<MyFormValues>>();
    });
  });

  describe("useForm-no-schema-no-generic", () => {
    it("inferred type should be passed to onFinish callback", () => {
      useForm({
        onFinish: (values) => {
          expectTypeOf(values).toEqualTypeOf<unknown>();
        },
      });
    });

    it("inferred type should be passed to form return type", () => {
      const { form, formProps } = useForm();
      expectTypeOf(form).toEqualTypeOf<FormInstance<unknown>>();
      expectTypeOf(formProps).toEqualTypeOf<FormProps<unknown>>();
    });
  });

  describe("FormList getName", () => {
    const schema = z.object({
      users: z.array(
        z.object({
          email: z.string(),
          profile: z.object({
            firstName: z.string(),
            lastName: z.string(),
          }),
        }),
      ),
    });

    it("getName should return full path with correct types", () => {
      const { FormList } = useForm({ validator: schema });

      FormList({
        name: "users",
        children: (fields) => {
          const field = fields[0];
          if (!field) return null;

          // getName should accept valid relative paths
          const emailPath = field.getName(["email"]);
          expectTypeOf(emailPath).toEqualTypeOf<["users", number, "email"]>();

          const firstNamePath = field.getName(["profile", "firstName"]);
          expectTypeOf(firstNamePath).toEqualTypeOf<
            ["users", number, "profile", "firstName"]
          >();

          // name should be deprecated number (the field index)
          expectTypeOf(field.name).toEqualTypeOf<number>();

          return null;
        },
      });
    });

    it("getName should work with array name syntax", () => {
      const { FormList } = useForm({ validator: schema });

      FormList({
        name: ["users"],
        children: (fields) => {
          const field = fields[0];
          if (!field) return null;

          const lastNamePath = field.getName(["profile", "lastName"]);
          expectTypeOf(lastNamePath).toEqualTypeOf<
            ["users", number, "profile", "lastName"]
          >();

          return null;
        },
      });
    });
  });
});
