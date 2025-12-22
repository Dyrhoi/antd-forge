import { describe, expectTypeOf, it } from "vitest";
import { useForm } from "../src/useForm";

describe("useWatch", () => {
  describe("namepath", () => {
    it("should accept flat schema paths", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { useWatch } = useForm<{ firstName: string; age: number }>();
      type Params = Parameters<typeof useWatch>[0];
      expectTypeOf<Params>().toEqualTypeOf<
        "firstName" | "age" | ["firstName"] | ["age"]
      >();
    });

    it("should accept nested schema paths", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { useWatch } = useForm<{
        user: {
          name: string;
          age: number;
          emails: Array<{ active: boolean; mail: string }>;
        };
      }>();
      type Params = Parameters<typeof useWatch>[0];
      expectTypeOf<Params>().toEqualTypeOf<
        | "user"
        | ["user"]
        | ["user", "name"]
        | ["user", "age"]
        | ["user", "emails"]
        | ["user", "emails", number]
        | ["user", "emails", number, "active"]
        | ["user", "emails", number, "mail"]
      >();
    });
  });

  describe("return type", () => {
    const createForm = () =>
      useForm<{
        user: {
          name: string;
          age: number;
          emails: Array<{ active: boolean; mail: string }>;
        };
      }>();

    it("should infer scalar property types", () => {
      const { useWatch } = createForm();

      const name = useWatch(["user", "name"]);
      expectTypeOf(name).toEqualTypeOf<string | undefined>();

      const age = useWatch(["user", "age"]);
      expectTypeOf(age).toEqualTypeOf<number | undefined>();
    });

    it("should infer array property types", () => {
      const { useWatch } = createForm();

      const emails = useWatch(["user", "emails"]);
      expectTypeOf(emails).toEqualTypeOf<
        Array<{ active?: boolean; mail?: string }> | undefined
      >();
    });

    it("should infer array element types", () => {
      const { useWatch } = createForm();

      const email = useWatch(["user", "emails", 0]);
      expectTypeOf(email).toEqualTypeOf<
        { active?: boolean; mail?: string } | undefined
      >();
    });

    it("should infer nested object types", () => {
      const { useWatch } = createForm();

      const user = useWatch(["user"]);
      expectTypeOf(user).toEqualTypeOf<
        | {
            name?: string;
            age?: number;
            emails?: Array<{ active?: boolean; mail?: string }>;
          }
        | undefined
      >();
    });
  });
});
