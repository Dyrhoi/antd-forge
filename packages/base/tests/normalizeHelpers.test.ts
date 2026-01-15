import { describe, expect, it } from "vitest";
import {
  cleanEmptyValues,
  defaultEmptyValuesToUndefined,
} from "../src";

describe("normalizeHelpers", () => {
  describe("cleanEmptyValues", () => {
    it("returns undefined for empty primitives", () => {
      expect(cleanEmptyValues(undefined)).toBe(undefined);
      expect(cleanEmptyValues(null)).toBe(undefined);
      expect(cleanEmptyValues("")).toBe(undefined);
      expect(cleanEmptyValues(NaN)).toBe(undefined);
    });

    it("returns value for non-empty primitives", () => {
      expect(cleanEmptyValues("hello")).toBe("hello");
      expect(cleanEmptyValues(42)).toBe(42);
      expect(cleanEmptyValues(0)).toBe(0);
      expect(cleanEmptyValues(false)).toBe(false);
      expect(cleanEmptyValues(true)).toBe(true);
    });

    it("returns undefined for empty array", () => {
      expect(cleanEmptyValues([])).toBe(undefined);
    });

    it("returns undefined for array with only empty values", () => {
      expect(cleanEmptyValues([null, undefined, ""])).toBe(undefined);
    });

    it("filters empty values from array", () => {
      expect(cleanEmptyValues(["a", "", "b"])).toEqual(["a", "b"]);
      expect(cleanEmptyValues([1, null, 2])).toEqual([1, 2]);
      expect(cleanEmptyValues(["x", undefined])).toEqual(["x"]);
    });

    it("returns undefined for empty object", () => {
      expect(cleanEmptyValues({})).toBe(undefined);
    });

    it("returns undefined for object with only empty values", () => {
      expect(cleanEmptyValues({ a: null, b: "" })).toBe(undefined);
    });

    it("removes empty properties from object", () => {
      expect(cleanEmptyValues({ a: "x", b: null })).toEqual({ a: "x" });
      expect(cleanEmptyValues({ a: "x", b: "", c: "y" })).toEqual({
        a: "x",
        c: "y",
      });
    });

    it("cleans nested arrays", () => {
      expect(cleanEmptyValues([["a", ""], ["", ""]])).toEqual([["a"]]);
      expect(cleanEmptyValues([[null], ["x"]])).toEqual([["x"]]);
    });

    it("cleans nested objects", () => {
      expect(cleanEmptyValues({ a: { b: null, c: "x" } })).toEqual({
        a: { c: "x" },
      });
      expect(cleanEmptyValues({ a: { b: { c: "" } } })).toBe(undefined);
    });

    it("cleans mixed nested structures", () => {
      expect(
        cleanEmptyValues({
          users: [
            { name: "Alice", bio: "" },
            { name: "", bio: null },
          ],
        }),
      ).toEqual({
        users: [{ name: "Alice" }],
      });

      expect(
        cleanEmptyValues({
          data: {
            items: ["a", "", "b"],
            meta: { count: 0, label: null },
          },
        }),
      ).toEqual({
        data: {
          items: ["a", "b"],
          meta: { count: 0 },
        },
      });
    });
  });

  describe("defaultEmptyValuesToUndefined", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createParams = (value: unknown) =>
      ({
        name: ["test"],
        value,
        match: () => false,
      }) as any;

    it("converts empty string to undefined", () => {
      expect(defaultEmptyValuesToUndefined(createParams(""))).toBe(undefined);
    });

    it("converts null to undefined", () => {
      expect(defaultEmptyValuesToUndefined(createParams(null))).toBe(undefined);
    });

    it("converts empty object to undefined", () => {
      expect(defaultEmptyValuesToUndefined(createParams({}))).toBe(undefined);
    });

    it("cleans object with empty values", () => {
      expect(
        defaultEmptyValuesToUndefined(createParams({ a: "x", b: null })),
      ).toEqual({ a: "x" });
    });

    it("preserves non-empty values", () => {
      expect(defaultEmptyValuesToUndefined(createParams("hello"))).toBe(
        "hello",
      );
      expect(defaultEmptyValuesToUndefined(createParams(42))).toBe(42);
      expect(defaultEmptyValuesToUndefined(createParams(0))).toBe(0);
    });
  });
});
