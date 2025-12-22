"use client";

import { useTable, createTableQueryOptions } from "antd-forge";
import { Button, Form, Input, Select, Table, Tag } from "antd";
import { queryOptions } from "@tanstack/react-query";
import z from "zod";
import { mockProducts, type Product } from "./mockdata/products";

const schema = z.object({
  search: z.string().optional(),
  category: z.array(z.enum(["electronics", "furniture"])).optional(),
});

type Filters = z.infer<typeof schema>;

// Simulated API fetch - returns ALL data, no pagination
async function fetchAllProducts(filters: Filters) {
  await new Promise((resolve) => setTimeout(resolve, 300));

  let filtered = [...mockProducts];

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
  }

  if (filters.category && filters.category.length > 0) {
    filtered = filtered.filter((p) => filters.category?.includes(p.category));
  }

  return filtered;
}

// Client pagination mode - notice the `{ pagination: { mode: 'client' } }` config
const productsQueryOptions = createTableQueryOptions<Filters, Product>({
  pagination: { mode: "client" },
})(({ filters }) =>
  queryOptions({
    queryKey: ["products-client", filters],
    queryFn: () => fetchAllProducts(filters),
    // No need for `select` to transform to { data, total } - just return the array
    staleTime: 30 * 1000,
  }),
);

export default function UseTableClientPaginationExample() {
  const { formProps, FormItem, tableProps, query } = useTable({
    validator: schema,
    queryOptions: productsQueryOptions,
    pagination: {
      mode: "client",
      initial: { pageSize: 5 },
    },
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
        <Button type="primary" htmlType="submit">
          Search
        </Button>
      </Form>

      <Table
        {...tableProps}
        title={() =>
          query.isFetching
            ? "Loading..."
            : `${(query.data as Product[] | undefined)?.length ?? 0} results`
        }
        columns={[
          { title: "Name", dataIndex: "name", key: "name" },
          {
            title: "Category",
            dataIndex: "category",
            key: "category",
            render: (cat: string) => (
              <Tag color={cat === "electronics" ? "blue" : "orange"}>{cat}</Tag>
            ),
          },
          {
            title: "Price",
            dataIndex: "price",
            key: "price",
            render: (price: number) => `$${price}`,
          },
          { title: "Stock", dataIndex: "stock", key: "stock" },
        ]}
        rowKey="id"
        size="small"
      />
    </div>
  );
}
