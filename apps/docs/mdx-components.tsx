import { ComponentPreview } from "@/components/component-preview";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import * as Twoslash from "fumadocs-twoslash/ui";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...components,
    ...Twoslash,
    ExamplePreview: ({ ref: _refine, ...props }) => (
      <ComponentPreview {...props} />
    ),
  };
}
