"use client";

import { useForm } from "antd-forge";
import { Form, Input, Card, Typography } from "antd";
import z from "zod";
import { useState } from "react";

const schema = z.object({
  search: z.string().optional(),
});

export default function UseFormAutoSubmitExample() {
  const [submittedValues, setSubmittedValues] = useState<z.infer<
    typeof schema
  > | null>(null);
  const [submitCount, setSubmitCount] = useState(0);

  const { formProps, FormItem } = useForm({
    validator: schema,
    autoSubmit: "auto", // or { mode: "auto", debounce: 500 }
    onFinish: (values) => {
      setSubmittedValues(values);
      setSubmitCount((c) => c + 1);
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Form {...formProps} layout="vertical">
        <FormItem name={["search"]} label="Search (auto-submits as you type)">
          <Input placeholder="Start typing..." />
        </FormItem>
      </Form>

      <Card size="small">
        <Typography.Text type="secondary">
          Submit count: {submitCount}
        </Typography.Text>
        <pre style={{ margin: 0, marginTop: 8 }}>
          {submittedValues
            ? JSON.stringify(submittedValues, null, 2)
            : "No submission yet"}
        </pre>
      </Card>
    </div>
  );
}
