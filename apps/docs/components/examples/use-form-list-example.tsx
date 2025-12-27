"use client";

import { MinusCircleOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { useForm } from "antd-forge";
import { Button, Checkbox, Flex, Form, Input } from "antd";
import z from "zod";

export default function UseFormExample() {
  const { Form, FormItem, FormList } = useForm({
    validator: z.object({
      username: z.string().min(3, "Username must be at least 3 characters"),
      emails: z
        .array(
          z.object({
            email: z.string().email("Invalid email address"),
            updates: z.object({
              security: z.boolean(),
              newsletter: z.boolean(),
            }),
          }),
        )
        .min(1, "At least one email is required")
        .refine((emails) => emails.some((email) => email.updates.security), {
          message: "At least one email must receive security updates",
        }),
    }),
    onFinish: (values: unknown) => {
      alert(`${JSON.stringify(values, null, 2)}`);
    },
  });

  return (
    <Form layout="vertical">
      <FormItem name="username" label="Username">
        <Input />
      </FormItem>
      <FormItem label="Emails" name="emails">
        <FormList name="emails" initialValue={[]}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name: index }) => {
                return (
                  <Flex key={key} align="baseline" gap="middle">
                    <FormItem
                      style={{ flex: 1 }}
                      name={["emails", index, "email"]}
                    >
                      <Input placeholder="john_doe@example.com" />
                    </FormItem>
                    <FormItem
                      name={["emails", index, "updates", "security"]}
                      initialValue={false}
                      valuePropName="checked"
                    >
                      <Checkbox>Receive Security Updates</Checkbox>
                    </FormItem>
                    <FormItem
                      name={["emails", index, "updates", "newsletter"]}
                      initialValue={false}
                      valuePropName="checked"
                    >
                      <Checkbox>Receive Newsletter</Checkbox>
                    </FormItem>
                    <MinusCircleOutlined
                      style={{ marginLeft: "auto" }}
                      onClick={() => remove(index)}
                    />
                  </Flex>
                );
              })}
              <FormItem>
                <Button
                  type="dashed"
                  block
                  icon={<PlusCircleOutlined />}
                  onClick={() => add()}
                >
                  Add Email
                </Button>
              </FormItem>
            </>
          )}
        </FormList>
      </FormItem>
      <Button type="primary" htmlType="submit">
        Submit
      </Button>
    </Form>
  );
}
