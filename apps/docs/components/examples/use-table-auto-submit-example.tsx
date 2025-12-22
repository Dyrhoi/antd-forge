"use client";

import { useTable } from "antd-forge";
import { Form, Input, Select, Table, Tag } from "antd";
import z from "zod";
import { mockProducts, type Product } from "./mockdata/products";

const schema = z.object({
  search: z.string().optional(),
  category: z.array(z.enum(["electronics", "furniture"])).optional(),
});

type Filters = z.infer<typeof schema>;
type Pagination = { current: number; pageSize: number };

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

  const start = (pagination.current - 1) * pagination.pageSize;
  const paged = filtered.slice(start, start + pagination.pageSize);

  return { data: paged, total: filtered.length };
}

export default function UseTableAutoSubmitExample() {
  const { formProps, FormItem, tableProps, query } = useTable({
    validator: schema,
    autoSubmit: { mode: "auto", debounce: 400 }, // Auto-submit with 400ms debounce
    search: ({ filters, pagination }) => fetchProducts(filters, pagination),
    pagination: { initial: { pageSize: 5 } },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Form {...formProps} layout="inline">
        <FormItem name="search">
          <Input placeholder="Search products..." style={{ width: 200 }} />
        </FormItem>
        <FormItem name="category">
          <Select
            placeholder="Category"
            mode="multiple"
            allowClear
            style={{ width: 180 }}
          >
            <Select.Option value="electronics">Electronics</Select.Option>
            <Select.Option value="furniture">Furniture</Select.Option>
          </Select>
        </FormItem>
        {/* No submit button needed - form auto-submits on change */}
      </Form>

      <Table
        {...tableProps}
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
        ]}
        rowKey="id"
        size="small"
      />
    </div>
  );
}
