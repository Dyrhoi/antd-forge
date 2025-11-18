"use client";

import { useForm } from "@dyrhoi/antd-crux";
import { Button, Form, Input } from "antd";
import z from "zod";

async function isSlugAvailable({ slug }: { slug: string }) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const takenSlugs = ["admin", "user", "test"];
  return !takenSlugs.includes(slug);
}

export default function UseFormExample() {
  const { formProps, FormItem } = useForm({
    validator: z.object({
      username: z
        .string("Please enter Username")
        .min(3, "Username must be at least 3 characters"),
      favoriteNumber: z.coerce
        .number("Favorite Number must be set and a number")
        .min(10, "Favorite Number must be at least 10"),
      slug: z
        .string()
        .min(3)
        .transform((val) => val.toLowerCase())
        .refine(async (val) => {
          const available = await isSlugAvailable({ slug: val });
          return available;
        }, "Slug is already taken"),
    }),
    onFinish: (values) => {
      alert(`${JSON.stringify(values, null, 2)}`);
    },
  });

  return (
    <Form {...formProps} layout="vertical">
      <FormItem name={["username"]} label="Username" required>
        <Input />
      </FormItem>
      <FormItem name={["favoriteNumber"]} label="Favorite Number" required>
        <Input />
      </FormItem>
      <FormItem name={["slug"]} label="Slug" required>
        <Input />
      </FormItem>
      <FormItem>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </FormItem>
    </Form>
  );
}
