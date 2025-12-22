"use client";

import { MinusCircleOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { useForm } from "antd-forge";
import { Button, Card, Checkbox, Flex, Form, Input, Space } from "antd";
import z from "zod";

export default function UseFormExample() {
  const { formProps, FormItem, FormList } = useForm({
    validator: z.object({
      username: z.string().min(3, "Username must be at least 3 characters"),
      emails: z
        .array(
          z.object({
            email: z.email("Invalid email address"),
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
    <Form {...formProps} layout="vertical">
      <FormItem name={["username"]} label="Username">
        <Input />
      </FormItem>
      <FormItem label="Emails" name={"emails"}>
        <FormList name={"emails"} initialValue={[{}]}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, getName, name, ...restField }) => {
                return (
                  <Flex key={key} align="baseline" gap={"middle"}>
                    <FormItem
                      style={{ flex: 1 }}
                      key={key}
                      name={getName(["email"])}
                      {...restField}
                    >
                      <Input placeholder="john_doe@example.com" />
                    </FormItem>
                    <FormItem
                      name={getName(["updates", "security"])}
                      initialValue={false}
                      valuePropName="checked"
                    >
                      <Checkbox>Receive Security Updates</Checkbox>
                    </FormItem>
                    <FormItem
                      name={getName(["updates", "newsletter"])}
                      initialValue={false}
                      valuePropName="checked"
                    >
                      <Checkbox>Receive Newsletter</Checkbox>
                    </FormItem>
                    <MinusCircleOutlined
                      style={{ marginLeft: "auto" }}
                      onClick={() => remove(name)}
                    />
                  </Flex>
                );
              })}
              <Form.Item>
                <Button
                  type="dashed"
                  block
                  icon={<PlusCircleOutlined />}
                  onClick={() => add()}
                >
                  Add Email
                </Button>
              </Form.Item>
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
