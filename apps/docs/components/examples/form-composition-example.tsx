"use client";

import { AddressFields, addressSchema } from "./form-composition-shared";
import { useForm } from "antd-forge";
import { Button, Input } from "antd";
import z from "zod";

const userSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  address: addressSchema,
});

const companySchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  website: z.string().url("Enter a valid URL").optional(),
  offices: z.array(addressSchema).min(1, "At least one office"),
});

type UserFormValues = z.infer<typeof userSchema>;
type CompanyFormValues = z.infer<typeof companySchema>;

export default function FormCompositionExample() {
  return (
    <div
      style={{
        display: "grid",
        gap: 24,
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
      }}
    >
      <UserFormCard />
      <CompanyFormCard />
    </div>
  );
}

function UserFormCard() {
  const { formProps, FormItem, Form } = useForm({
    validator: userSchema,
    onFinish: (values) => console.log("User submitted", values),
  });

  return (
    <div style={{ borderRadius: 12, padding: 16 }}>
      <Form {...formProps}>
        <FormItem name={["name"]} label="Full Name">
          <Input placeholder="Ada Lovelace" />
        </FormItem>
        <FormItem name={["email"]} label="Email">
          <Input placeholder="ada@example.com" />
        </FormItem>

        <FormItem label="Address" style={{ marginBottom: 0 }}>
          <FormItem name={["address"]} noStyle>
            <AddressFields />
          </FormItem>
        </FormItem>

        <Button type="primary" htmlType="submit" style={{ marginTop: 12 }}>
          Save User
        </Button>
      </Form>
    </div>
  );
}

function CompanyFormCard() {
  const { formProps, Form, FormItem, FormList } = useForm({
    validator: companySchema,
    onFinish: (values) => console.log("Company submitted", values),
  });

  return (
    <div style={{ borderRadius: 12, padding: 16 }}>
      <Form {...formProps}>
        <FormItem name={["companyName"]} label="Company Name">
          <Input placeholder="Acme Inc." />
        </FormItem>
        <FormItem name={["website"]} label="Website">
          <Input placeholder="https://example.com" />
        </FormItem>

        <FormList name={["offices"]} initialValue={[{}]}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name: index }) => (
                <div key={key}>
                  <FormItem
                    label={`Office ${index + 1}`}
                    style={{ marginBottom: 8 }}
                  >
                    <FormItem name={["offices", index]} noStyle>
                      <AddressFields />
                    </FormItem>
                  </FormItem>

                  <Button
                    danger
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    Remove office
                  </Button>
                </div>
              ))}

              <Button type="dashed" onClick={() => add()} block>
                Add another office
              </Button>
            </>
          )}
        </FormList>

        <Button type="primary" htmlType="submit" style={{ marginTop: 12 }}>
          Save Company
        </Button>
      </Form>
    </div>
  );
}
