import { AntdForge } from "@/components/icons";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2">
          <AntdForge className="w-5" />
          <span>
            Ant Design <span className="font-bold">Forge</span>
          </span>
        </div>
      ),
    },
  };
}
