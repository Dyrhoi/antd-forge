import { describe, it } from "vitest";
import { useForm } from "../src/useForm";

describe("FormItem", () => {
  describe("namepath", () => {
    const { FormItem } = useForm<{
      firstName: string;
      age: number;
      5: string;
    }>();
    it("should accept non-array namepaths", () => {
      <FormItem name="firstName" />;
    });
    it("should accept array namepaths", () => {
      <FormItem name={["firstName"]} />;
    });
    it("should accept numeric namepaths", () => {
      <FormItem name={5} />;
    });
    it("should accept undefined namepaths", () => {
      <FormItem name={undefined} />;
    });
  });
});
