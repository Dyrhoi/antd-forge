"use client";

import { useForm } from "@dyrhoi/antd-forge";
import { Button, Form, Input } from "antd";
import z from "zod";

export default function UseFormExample() {
  const { formProps, FormItem } = useForm({
    validator: z.object({
      username: z
        .string("Please enter Username")
        .min(3, "Username must be at least 3 characters"),
      favoriteNumber: z.coerce
        .number("Favorite Number must be set and a number")
        .min(10, "Favorite Number must be at least 10"),
      slug: z.string().trim().min(3).or(z.literal("")).optional(),
    }),
    onFinish: (values) => {
      alert(`${JSON.stringify(values, null, 2)}`);
    },
  });

  return (
    <Form {...formProps} layout="vertical">
      <FormItem name={["username"]} label="Username">
        <Input />
      </FormItem>
      <FormItem name={["favoriteNumber"]} label="Favorite Number">
        <Input />
      </FormItem>
      <FormItem name={["slug"]} label="Slug">
        <Input />
      </FormItem>
      <Button type="primary" htmlType="submit">
        Submit
      </Button>
    </Form>
  );
}
