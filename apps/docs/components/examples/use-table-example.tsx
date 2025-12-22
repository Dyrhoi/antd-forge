"use client";

import { useTable, createTableQueryOptions } from "antd-forge";
import { Button, Form, Input, Select, Table, Tag } from "antd";
import { queryOptions } from "@tanstack/react-query";
import z from "zod";
import { mockProducts, type Product } from "./mockdata/products";

const schema = z.object({
  search: z.string().optional(),
  category: z.array(z.enum(["electronics", "furniture"])).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
});

type Filters = z.infer<typeof schema>;
type Pagination = { current: number; pageSize: number };

// Simulated API fetch with server-side pagination
async function fetchProducts(filters: Filters, pagination: Pagination) {
  await new Promise((resolve) => setTimeout(resolve, 300));

  let filtered = [...mockProducts];

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
  }

  if (filters.category && filters.category.length > 0) {
    filtered = filtered.filter((p) => filters.category!.includes(p.category));
  }

  if (filters.minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= filters.minPrice!);
  }

  if (filters.maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= filters.maxPrice!);
  }

  // Server-side pagination
  const start = (pagination.current - 1) * pagination.pageSize;
  const paged = filtered.slice(start, start + pagination.pageSize);

  return {
    items: paged,
    totalCount: filtered.length,
  };
}

// Colocated query options - can be defined in a separate file
const productsQueryOptions = createTableQueryOptions<Filters, Product>()(
  ({ filters, pagination }) =>
    queryOptions({
      queryKey: ["products", filters, pagination],
      queryFn: () => fetchProducts(filters, pagination),
      select: (data) => ({
        data: data.items,
        total: data.totalCount,
      }),
      staleTime: 30 * 1000, // 30 seconds
    }),
);

export default function UseTableQueryOptionsExample() {
  const { formProps, FormItem, tableProps, query } = useTable({
    validator: schema,
    queryOptions: productsQueryOptions,
    pagination: { initial: { pageSize: 5 } }, // Show pagination with 5 items per page
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Form {...formProps} layout="inline">
        <FormItem name="search">
          <Input placeholder="Search products..." style={{ width: 160 }} />
        </FormItem>
        <FormItem name="category">
          <Select
            placeholder="Category"
            mode="multiple"
            allowClear
            style={{ width: 130 }}
          >
            <Select.Option value="electronics">Electronics</Select.Option>
            <Select.Option value="furniture">Furniture</Select.Option>
          </Select>
        </FormItem>
        <FormItem name="minPrice">
          <Input type="number" placeholder="Min $" style={{ width: 90 }} />
        </FormItem>
        <FormItem name="maxPrice">
          <Input type="number" placeholder="Max $" style={{ width: 90 }} />
        </FormItem>
        <Button type="primary" htmlType="submit">
          Search
        </Button>
      </Form>

      <Table
        {...tableProps}
        pagination={{ ...tableProps.pagination, showSizeChanger: true }}
        title={() =>
          query.isFetching ? "Loading..." : `${query.data?.total ?? 0} results`
        }
        columns={[
          { title: "Name", dataIndex: "name", key: "name" },
          {
            title: "Category",
            dataIndex: "category",
            key: "category",
            render: (cat: string) => (
              <Tag color={cat === "electronics" ? "blue" : "green"}>{cat}</Tag>
            ),
          },
          {
            title: "Price",
            dataIndex: "price",
            key: "price",
            render: (price: number) => `$${price}`,
          },
          {
            title: "Stock",
            dataIndex: "stock",
            key: "stock",
            render: (stock: number) => (
              <span style={{ color: stock < 20 ? "red" : "inherit" }}>
                {stock}
              </span>
            ),
          },
        ]}
        rowKey="id"
        size="small"
      />
    </div>
  );
}
