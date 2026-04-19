import { IconExternalLink } from "../../../../components/icons";
import { Button } from "../../../../components/ui/button";
import type { SettingsSectionContentProps } from "./types";

export function AboutSection({
  settings,
  openExternal,
}: SettingsSectionContentProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="app-panel-subtle rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            App
          </p>
          <p className="mt-2 text-base font-semibold text-foreground">
            {settings?.appName ?? "Mino Gesture"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {settings?.bundleIdentifier ?? "com.mino.gesture"}
          </p>
        </div>
        <div className="app-panel-subtle rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Author
          </p>
          <p className="mt-2 text-base font-semibold text-foreground">
            {settings?.about.author ?? "-"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {settings?.about.githubUrl ?? "-"}
          </p>
        </div>
      </div>
      <div className="app-panel-surface rounded-[24px] p-5">
        <p className="text-sm font-semibold text-foreground">项目仓库</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          可在 GitHub 查看源码、版本发布以及后续更新。
        </p>
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void openExternal(settings?.about.githubUrl ?? "")}
            disabled={!settings?.about.githubUrl}
          >
            <IconExternalLink className="h-4 w-4" />
            打开 GitHub
          </Button>
        </div>
      </div>
    </div>
  );
}
