import fs from "node:fs/promises";
import { ComponentPreviewWrapper } from "@/components/component-preview-wrapper";
import path from "node:path";
import { CodeBlock } from "fumadocs-ui/components/codeblock";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { highlightCode } from "@/lib/highlight-code";

type FileSource = {
  path: string;
  name?: string;
};

type ComponentPreviewProps = {
  src: string;
  files?: FileSource[];
};

export function ComponentPreview({ src, files }: ComponentPreviewProps) {
  return (
    <ComponentPreviewWrapper>
      <ComponentSource src={src} files={files} />
    </ComponentPreviewWrapper>
  );
}

async function ComponentSource({
  src,
  files = [],
}: {
  src: string;
  files?: FileSource[];
}) {
  const mainCode = await fs.readFile(
    path.join(process.cwd(), "components", src),
    "utf-8",
  );

  const Component = (await import(`@/components/${src}`)).default;

  if (!mainCode || !Component) {
    return (
      <div className="bg-muted/20 px-16 pt-8 relative overflow-hidden rounded-xl border">
        <div className="relative z-10">Component not found</div>
      </div>
    );
  }

  // Load additional files
  const additionalFiles = await Promise.all(
    files.map(async (file) => {
      const code = await fs.readFile(
        path.join(process.cwd(), "components", file.path),
        "utf-8",
      );
      return {
        name: file.name || path.basename(file.path),
        code,
      };
    }),
  );

  const mainFileName = path.basename(src);
  const allFiles = [
    { name: mainFileName, code: mainCode },
    ...additionalFiles,
  ];

  return (
    <div className="overflow-hidden rounded-xl border not-prose">
      <div className="bg-muted/20 px-16 py-8 relative border-b">
        <div className="absolute opacity-10 inset-0 h-full w-full bg-muted bg-[radial-gradient(var(--muted-foreground)_1px,transparent_1px)] bg-size-[16px_16px]"></div>
        <div className="relative z-10">
          <Component />
        </div>
      </div>
      {allFiles.length === 1 ? (
        <ComponentCode code={mainCode} />
      ) : (
        <Tabs
          items={allFiles.map((f) => f.name)}
          className="rounded-none my-0 border-0 [&>div:first-child]:border-b [&>div:first-child]:border-t-0 [&>div:first-child]:rounded-none [&>div:first-child]:bg-fd-secondary/50"
        >
          {allFiles.map((file) => (
            <Tab key={file.name} value={file.name}>
              <ComponentCode code={file.code} />
            </Tab>
          ))}
        </Tabs>
      )}
    </div>
  );
}

async function ComponentCode({ code }: { code: string }) {
  const html = await highlightCode(code, "tsx");
  return (
    <CodeBlock
      data-line-numbers
      className="border-0 my-0 py-0 rounded-none [&>div]:py-0 [&_pre]:py-4 [&_pre]:rounded-none"
      keepBackground
    >
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </CodeBlock>
  );
}
