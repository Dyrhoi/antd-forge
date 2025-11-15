import fs from "node:fs/promises";
import { ComponentPreviewWrapper } from "@/components/component-preview-wrapper";
import path from "node:path";
import { codeToHtml } from "shiki";
import { CodeBlock, CodeBlockTab, Pre } from "fumadocs-ui/components/codeblock";
import { highlightCode } from "@/lib/highlight-code";

type ComponentPreviewProps = {
  src: string;
};
export function ComponentPreview({ src }: ComponentPreviewProps) {
  return (
    <ComponentPreviewWrapper>
      <ComponentSource src={src} />
    </ComponentPreviewWrapper>
  );
}

async function ComponentSource({ src }: { src: string }) {
  const code = await fs.readFile(
    path.join(process.cwd(), "components", src),
    "utf-8",
  );

  const Component = (await import(`@/components/${src}`)).default;

  if (!code || !Component) {
    return (
      <div className="bg-muted/20 px-16 pt-8 relative overflow-hidden rounded-xl border">
        <div className="relative z-10">Component not found</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="bg-muted/20 px-16 py-8 relative border-b">
        <div className="absolute opacity-10 inset-0 h-full w-full bg-muted bg-[radial-gradient(var(--muted-foreground)_1px,transparent_1px)] bg-size-[16px_16px]"></div>
        <div className="relative z-10">
          <Component />
        </div>
      </div>
      <ComponentCode code={code} />
    </div>
  );
}

async function ComponentCode({ code }: { code: string }) {
  const html = await highlightCode(code, "tsx");
  return (
    <CodeBlock
      data-line-numbers
      className="border-0 my-0 py-0 rounded-none [&>div]:py-0 [&_pre]:pt-4"
      keepBackground
    >
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </CodeBlock>
  );
}
