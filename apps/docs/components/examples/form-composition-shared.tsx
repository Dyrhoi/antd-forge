"use client";

import { Input } from "antd";
import { useFormInstance } from "antd-forge";
import z from "zod";

export const addressSchema = z.object({
  line1: z.string().min(1, "Street is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "Use 2-letter state code"),
  postalCode: z.string().min(4, "Postal code is too short"),
});

export type Address = z.infer<typeof addressSchema>;

export function AddressFields() {
  const { FormItem } = useFormInstance<Address>({ inherit: true });

  return (
    <>
      <FormItem name={["line1"]} label="Street">
        <Input />
      </FormItem>
      <FormItem name={["line2"]} label="Apartment / Suite">
        <Input />
      </FormItem>
      <FormItem name={["city"]} label="City">
        <Input />
      </FormItem>
      <FormItem name={["state"]} label="State">
        <Input />
      </FormItem>
      <FormItem name={["postalCode"]} label="Postal Code">
        <Input />
      </FormItem>
    </>
  );
}
