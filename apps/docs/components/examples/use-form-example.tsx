"use client";

import { useForm } from "@dyrhoi/antd-crux";
import { Button, Form, Input, InputNumber } from "antd";
import z from "zod";

export default function UseFormExample() {
  const { formProps, register } = useForm({
    validator: z.object({
      username: z
        .string("Please enter Username")
        .min(3, "Username must be at least 3 characters"),
      favoriteNumber: z.coerce
        .number("Favorite Number must be set and a number")
        .min(10, "Favorite Number must be at least 10"),
    }),
    onFinish: (values) => {
      console.log("Form submitted with values:", values);
    },
  });

  return (
    <Form {...formProps} layout="vertical">
      <Form.Item
        {...register(["username"], {
          required: true,
          label: "Username",
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item
        {...register(["favoriteNumber"], {
          label: "Favorite Number",
          required: true,
        })}
      >
        <Input />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
}
