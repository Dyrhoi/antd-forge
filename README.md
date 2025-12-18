# antd-forge

> [!CAUTION]
> antd-forge does not have any version yet as it's not ready for usage yet.

A collection of React hooks that enhance [Ant Design](https://ant.design/) with better TypeScript support and common patterns I found myself rebuilding across projects.

## Why?

Ant Design is a fantastic UI library, but after using it across multiple projects, I kept running into the same pain points:

- **Type safety gaps** - Form field names, validation, and values often lose type information
- **Repetitive patterns** - Connecting form filters to data queries requires the same boilerplate every time
- **Schema validation** - Integrating modern schema validators (Zod, Valibot, ArkType) with Ant Design forms isn't straightforward

`antd-forge` aims to fill these gaps with a small set of focused hooks that make Ant Design more type-safe and reduce the boilerplate for common patterns.

Somewhat inspired by [refine.dev](https://refine.dev/), but with a slimmer footprint and no framework lock-in. Just hooks you can drop into existing Ant Design projects.

## Features

- **Type-safe forms** - Full autocomplete for field names, inferred types from schema validators
- **Schema validation** - First-class support for [Standard Schema](https://github.com/standard-schema/standard-schema) validators (Zod, Valibot, ArkType, etc.)
- **Form + Query integration** - Connect filter forms to data fetching with minimal boilerplate
- **Easy migration** - If you're already using Ant Design, you pretty much just have to adjust some imports

## Installation

```bash
npm install @dyrhoi/antd-forge
# or
pnpm add @dyrhoi/antd-forge
# or
bun add @dyrhoi/antd-forge
```

## Documentation

[View full documentation](https://antd-forge-docs.vercel.app/docs) (coming soon)

## Quick Example

```tsx
import { useForm } from "@dyrhoi/antd-forge";
import { z } from "zod";
import { Form, Input, Button } from "antd";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

function MyForm() {
  const { formProps, FormItem } = useForm({
    validator: schema,
    onFinish: (values) => {
      // values is fully typed as { email: string; name: string }
      console.log(values);
    },
  });

  return (
    <Form {...formProps}>
      {/* name prop has autocomplete and type checking */}
      <FormItem name="email" label="Email">
        <Input />
      </FormItem>
      <FormItem name="name" label="Name">
        <Input />
      </FormItem>
      <Button type="primary" htmlType="submit">
        Submit
      </Button>
    </Form>
  );
}
```

## Contributing

This is a personal project born from patterns I've found useful. Issues and PRs are welcome, but keep in mind it's still early days.

## License

MIT
