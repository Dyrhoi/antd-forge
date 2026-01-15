import {
  AntDesign,
  AntdForge,
  StandardSchema,
  TanStackColor,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";

const sourceIconMap = [
  {
    name: "Ant Design",
    icon: <AntDesign />,
    match: (url: string) => url.includes("ant.design"),
  },
  {
    name: "Standard Schema",
    icon: <StandardSchema />,
    match: (url: string) => url.includes("standardschema.dev"),
  },
  {
    name: "TanStack",
    icon: <TanStackColor width={16} height={16} />,
    match: (url: string) => url.includes("tanstack.com"),
  },
  {
    name: "Ant Design Forge",
    icon: <AntdForge width={16} height={16} />,
    match: (url: string) =>
      url.includes("antd-typed.dyrhoi.com") || url.startsWith("/"),
  },
];

interface SourceListProps {
  items: Record<string, string>;
}
export function SourceList({ items }: SourceListProps) {
  return (
    <ul className="flex flex-wrap gap-2 items-center">
      {Object.entries(items).map(([name, url]) => (
        <li key={name} className="flex items-center">
          <SourceButton url={url} name={name} />
        </li>
      ))}
    </ul>
  );
}

interface SourceButtonProps extends React.ComponentProps<typeof Badge> {
  url: string;
  name: string;
}
export function SourceButton({ url, name, ...props }: SourceButtonProps) {
  const sourceIcon = sourceIconMap.find((source) => source.match(url));

  return (
    <Badge variant={"secondary"} {...props} asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        {sourceIcon ? sourceIcon.icon : null}
        {name}
      </a>
    </Badge>
  );
}
