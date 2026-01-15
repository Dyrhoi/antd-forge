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

  describe("FormList field data", () => {
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

    it("should provide key and name (index) for full path construction", () => {
      const { FormList } = useForm({ validator: schema });

      FormList({
        name: ["users"],
        children: (fields) => {
          const field = fields[0];
          if (!field) return null;

          // name is the array index (number) - use for full path construction
          expectTypeOf(field.name).toEqualTypeOf<number>();

          // key is a stable React key (number)
          expectTypeOf(field.key).toEqualTypeOf<number>();

          return null;
        },
      });
    });

    it("FormList should accept array name syntax", () => {
      const { FormList } = useForm({ validator: schema });

      FormList({
        name: ["users"],
        children: (fields) => {
          const field = fields[0];
          if (!field) return null;

          // key and name should be numbers
          expectTypeOf(field.key).toBeNumber();
          expectTypeOf(field.name).toBeNumber();

          return null;
        },
      });
    });
  });

  describe("normalizeValue", () => {
    const schema = z.object({
      username: z.string(),
      age: z.number(),
      tags: z.array(z.string()),
      profile: z.object({
        bio: z.string(),
      }),
    });

    it("params.value should be unknown before narrowing", () => {
      useForm({
        validator: schema,
        normalizeValue: (params) => {
          expectTypeOf(params.value).toBeUnknown();
          return params.value;
        },
      });
    });

    it("params.name should be union of valid paths", () => {
      useForm({
        validator: schema,
        normalizeValue: (params) => {
          // name is one of the valid paths from the schema
          expectTypeOf(params.name).toEqualTypeOf<
            | ["username"]
            | ["age"]
            | ["tags"]
            | ["tags", number]
            | ["profile"]
            | ["profile", "bio"]
          >();
          return params.value;
        },
      });
    });

    it("match should narrow value type for string field", () => {
      useForm({
        validator: schema,
        normalizeValue: (params) => {
          if (params.match(["username"])) {
            expectTypeOf(params.value).toEqualTypeOf<string>();
          }
          return params.value;
        },
      });
    });

    it("match should narrow value type for number field", () => {
      useForm({
        validator: schema,
        normalizeValue: (params) => {
          if (params.match(["age"])) {
            expectTypeOf(params.value).toEqualTypeOf<number>();
          }
          return params.value;
        },
      });
    });

    it("match should narrow value type for array field", () => {
      useForm({
        validator: schema,
        normalizeValue: (params) => {
          if (params.match(["tags"])) {
            expectTypeOf(params.value).toEqualTypeOf<string[]>();
          }
          return params.value;
        },
      });
    });

    it("match should narrow value type for nested object field", () => {
      useForm({
        validator: schema,
        normalizeValue: (params) => {
          if (params.match(["profile"])) {
            expectTypeOf(params.value).toEqualTypeOf<{ bio: string }>();
          }
          if (params.match(["profile", "bio"])) {
            expectTypeOf(params.value).toEqualTypeOf<string>();
          }
          return params.value;
        },
      });
    });

    it("match should accept string shorthand for single-segment paths", () => {
      useForm({
        validator: schema,
        normalizeValue: (params) => {
          if (params.match("username")) {
            expectTypeOf(params.value).toEqualTypeOf<string>();
          }
          return params.value;
        },
      });
    });

    it("match should only accept valid paths from schema", () => {
      useForm({
        validator: schema,
        normalizeValue: (params) => {
          // @ts-expect-error - 'invalid' is not a valid path
          params.match(["invalid"]);
          // @ts-expect-error - 'profile.invalid' is not a valid path
          params.match(["profile", "invalid"]);
          return params.value;
        },
      });
    });
  });
});
