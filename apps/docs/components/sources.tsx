import { AntDesign } from "@/components/icons";
import { Badge, BadgeProps } from "@/components/ui/badge";

const sourceIconMap = [
  {
    name: "Ant Design",
    icon: <AntDesign />,
    match: (url: string) => url.includes("ant.design"),
  },
];

interface SourceListProps {
  items: Record<string, string>;
}
export function SourceList({ items }: SourceListProps) {
  return (
    <ul className="flex flex-wrap gap-2">
      {Object.entries(items).map(([name, url]) => (
        <li key={name}>
          <SourceButton url={url} name={name} />
        </li>
      ))}
    </ul>
  );
}

interface SourceButtonProps extends BadgeProps {
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
