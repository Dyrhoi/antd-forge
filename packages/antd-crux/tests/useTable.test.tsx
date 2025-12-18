import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { useTable } from "../src/useTable";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ============================================================================
// Test Setup
// ============================================================================

const schema = z.object({ filter: z.string() });
type FilterValues = z.infer<typeof schema>;
type User = { id: number; name: string };

const mockUsers: User[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("search function behavior", () => {
    it("should call search function with initial filters (empty object)", async () => {
      const searchFn = vi.fn().mockResolvedValue({
        data: mockUsers,
        total: mockUsers.length,
      });

      const { result } = renderHook(
        () =>
          useTable({
            validator: schema,
            search: searchFn,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.query.isSuccess).toBe(true);
      });

      expect(searchFn).toHaveBeenCalledWith({
        filters: {},
        pagination: { current: 1, pageSize: 10 },
      });
    });

    it("should update filters and refetch when form is submitted", async () => {
      const searchFn = vi.fn().mockResolvedValue({
        data: mockUsers,
        total: mockUsers.length,
      });

      const { result } = renderHook(
        () =>
          useTable({
            validator: schema,
            search: searchFn,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.query.isSuccess).toBe(true);
      });

      // Simulate form submission with new filter values
      const newFilters: FilterValues = { filter: "search term" };
      await act(async () => {
        await result.current.formProps.onFinish?.(newFilters);
      });

      await waitFor(() => {
        expect(result.current.filters).toEqual(newFilters);
      });

      // Search should be called again with new filters
      expect(searchFn).toHaveBeenLastCalledWith({
        filters: newFilters,
        pagination: { current: 1, pageSize: 10 },
      });
    });

    it("should call user onFinish callback after updating filters", async () => {
      const userOnFinish = vi.fn();
      const searchFn = vi.fn().mockResolvedValue({
        data: mockUsers,
        total: mockUsers.length,
      });

      const { result } = renderHook(
        () =>
          useTable({
            validator: schema,
            search: searchFn,
            onFinish: userOnFinish,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.query.isSuccess).toBe(true);
      });

      const newFilters: FilterValues = { filter: "test" };
      await act(async () => {
        await result.current.formProps.onFinish?.(newFilters);
      });

      expect(userOnFinish).toHaveBeenCalledWith(newFilters);
    });
  });

  describe("tableProps binding", () => {
    it("should bind dataSource from query data", async () => {
      const { result } = renderHook(
        () =>
          useTable({
            validator: schema,
            search: async () => ({
              data: mockUsers,
              total: mockUsers.length,
            }),
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.query.isSuccess).toBe(true);
      });

      expect(result.current.tableProps.dataSource).toEqual(mockUsers);
    });

    it("should set loading true while query is fetching", async () => {
      let resolveSearch: (value: { data: User[]; total: number }) => void;
      const searchPromise = new Promise<{ data: User[]; total: number }>(
        (resolve) => {
          resolveSearch = resolve;
        },
      );

      const { result } = renderHook(
        () =>
          useTable({
            validator: schema,
            search: () => searchPromise,
          }),
        { wrapper: createWrapper() },
      );

      // Should be loading initially
      expect(result.current.tableProps.loading).toBe(true);
      expect(result.current.query.isLoading).toBe(true);

      // Resolve the search
      await act(async () => {
        resolveSearch!({ data: mockUsers, total: mockUsers.length });
      });

      await waitFor(() => {
        expect(result.current.tableProps.loading).toBe(false);
      });
    });

    it("should have undefined dataSource before query completes", () => {
      const { result } = renderHook(
        () =>
          useTable({
            validator: schema,
            search: () =>
              new Promise<{ data: User[]; total: number }>(() => {
                /* never resolves */
              }),
          }),
        { wrapper: createWrapper() },
      );

      expect(result.current.tableProps.dataSource).toBeUndefined();
    });
  });

  describe("queryOptions behavior", () => {
    it("should pass SearchProps to queryOptions function", async () => {
      const queryOptionsFn = vi.fn().mockReturnValue({
        queryKey: ["test"],
        queryFn: async () => ({ data: mockUsers, total: mockUsers.length }),
      });

      const { result } = renderHook(
        () =>
          useTable({
            validator: schema,
            queryOptions: queryOptionsFn,
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.query.isSuccess).toBe(true);
      });

      expect(queryOptionsFn).toHaveBeenCalledWith({
        filters: {},
        pagination: { current: 1, pageSize: 10 },
      });
    });

    it("should refetch when filters change with queryOptions", async () => {
      const queryFn = vi.fn().mockResolvedValue({
        data: mockUsers,
        total: mockUsers.length,
      });

      const { result } = renderHook(
        () =>
          useTable({
            validator: schema,
            queryOptions: (props) => ({
              queryKey: ["users", props.filters],
              queryFn,
            }),
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.query.isSuccess).toBe(true);
      });

      const initialCallCount = queryFn.mock.calls.length;

      // Submit form with new filters
      await act(async () => {
        await result.current.formProps.onFinish?.({ filter: "new search" });
      });

      await waitFor(() => {
        expect(queryFn.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe("filters state", () => {
    it("should expose current filters (initially empty object)", async () => {
      const { result } = renderHook(
        () =>
          useTable({
            validator: schema,
            search: async () => ({ data: [], total: 0 }),
          }),
        { wrapper: createWrapper() },
      );

      // Initial filters are empty object from form state
      expect(result.current.filters).toEqual({});

      // Update filters
      const newFilters: FilterValues = { filter: "test" };
      await act(async () => {
        await result.current.formProps.onFinish?.(newFilters);
      });

      expect(result.current.filters).toEqual(newFilters);
    });
  });

  describe("pagination", () => {
    it("should use default pagination values (current: 1, pageSize: 10)", async () => {
      const searchFn = vi.fn().mockResolvedValue({ data: [], total: 100 });

      const { result } = renderHook(
        () => useTable({ validator: schema, search: searchFn }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      expect(result.current.pagination).toEqual({
        current: 1,
        pageSize: 10,
        total: 100,
      });
    });

    it("should use custom initial pagination values", async () => {
      const searchFn = vi.fn().mockResolvedValue({ data: [], total: 100 });

      const { result } = renderHook(
        () =>
          useTable({
            validator: schema,
            search: searchFn,
            pagination: { initial: { current: 2, pageSize: 25 } },
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      expect(searchFn).toHaveBeenCalledWith({
        filters: {},
        pagination: { current: 2, pageSize: 25 },
      });
      expect(result.current.pagination.current).toBe(2);
      expect(result.current.pagination.pageSize).toBe(25);
    });

    it("should update pagination when tableProps.pagination.onChange is called", async () => {
      const searchFn = vi.fn().mockResolvedValue({ data: [], total: 100 });

      const { result } = renderHook(
        () => useTable({ validator: schema, search: searchFn }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      // Simulate page change via table
      act(() => {
        result.current.tableProps.pagination &&
          typeof result.current.tableProps.pagination === "object" &&
          result.current.tableProps.pagination.onChange?.(3, 10);
      });

      await waitFor(() => expect(result.current.pagination.current).toBe(3));

      expect(searchFn).toHaveBeenLastCalledWith({
        filters: {},
        pagination: { current: 3, pageSize: 10 },
      });
    });

    it("should reset to page 1 when pageSize changes", async () => {
      const searchFn = vi.fn().mockResolvedValue({ data: [], total: 100 });

      const { result } = renderHook(
        () =>
          useTable({
            validator: schema,
            search: searchFn,
            pagination: { initial: { current: 5, pageSize: 10 } },
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      expect(result.current.pagination.current).toBe(5);

      // Change pageSize
      act(() => {
        result.current.tableProps.pagination &&
          typeof result.current.tableProps.pagination === "object" &&
          result.current.tableProps.pagination.onChange?.(5, 20);
      });

      await waitFor(() => expect(result.current.pagination.pageSize).toBe(20));
      expect(result.current.pagination.current).toBe(1);
    });

    it("should reset to page 1 when filters change", async () => {
      const searchFn = vi.fn().mockResolvedValue({ data: [], total: 100 });

      const { result } = renderHook(
        () => useTable({ validator: schema, search: searchFn }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      // Navigate to page 3
      act(() => {
        result.current.tableProps.pagination &&
          typeof result.current.tableProps.pagination === "object" &&
          result.current.tableProps.pagination.onChange?.(3, 10);
      });

      await waitFor(() => expect(result.current.pagination.current).toBe(3));

      // Submit form with new filters
      act(() => {
        result.current.formProps.onFinish?.({ filter: "new" });
      });

      expect(result.current.pagination.current).toBe(1);
    });

    it("should expose total from query result", async () => {
      const { result } = renderHook(
        () =>
          useTable({
            validator: schema,
            search: async () => ({ data: [], total: 42 }),
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      expect(result.current.pagination.total).toBe(42);
      expect(
        result.current.tableProps.pagination &&
        typeof result.current.tableProps.pagination === "object" &&
        result.current.tableProps.pagination.total,
      ).toBe(42);
    });
  });
});
