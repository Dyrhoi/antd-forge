"use client";

import { useForm } from "antd-typed";
import { Input, Select, Card, Typography, Table } from "antd";
import z from "zod";
import { useState, useMemo } from "react";
import { mockUsers } from "./mockdata/users";

const filterSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
});

type Filters = z.infer<typeof filterSchema>;

export default function UseFormFilterExample() {
  const [filters, setFilters] = useState<Filters>({});
  const [submitCount, setSubmitCount] = useState(0);

  const { Form, FormItem } = useForm({
    validator: filterSchema,
    autoSubmit: "auto",
    onFinish: (values) => {
      setFilters(values);
      setSubmitCount((c) => c + 1);
    },
  });

  const filteredUsers = useMemo(() => {
    return mockUsers.filter((user) => {
      if (filters.status && user.status !== filters.status) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (
          !user.name.toLowerCase().includes(search) &&
          !user.email.toLowerCase().includes(search)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [filters]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Form layout="inline" style={{ gap: 8 }}>
        <FormItem name="status" style={{ minWidth: 120 }}>
          <Select
            placeholder="Status"
            allowClear
            options={[
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ]}
          />
        </FormItem>
        <FormItem name="search" style={{ minWidth: 200 }}>
          <Input placeholder="Search name or email..." />
        </FormItem>
      </Form>

      <Card size="small">
        <Typography.Text type="secondary">
          Filters applied {submitCount} times. Showing {filteredUsers.length} of{" "}
          {mockUsers.length} users.
        </Typography.Text>
      </Card>

      <Table
        dataSource={filteredUsers}
        rowKey="id"
        size="small"
        pagination={false}
        columns={[
          { title: "Name", dataIndex: "name", key: "name" },
          { title: "Email", dataIndex: "email", key: "email" },
          {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status: string) => (
              <span style={{ color: status === "active" ? "green" : "gray" }}>
                {status}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
