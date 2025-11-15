import { ComponentPreview } from "@/components/component-preview";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...components,
    ExamplePreview: ({ ref: _refine, ...props }) => (
      <ComponentPreview {...props} />
    ),
  };
}
