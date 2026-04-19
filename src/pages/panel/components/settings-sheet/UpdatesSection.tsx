import { IconExternalLink } from "../../../../components/icons";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import type { SettingsSectionContentProps } from "./types";

export function UpdatesSection({
  settings,
  openExternal,
}: SettingsSectionContentProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          App
        </span>
        <span className="text-base font-semibold text-foreground">
          {settings?.version ?? "-"}
        </span>
        <span className="text-muted-foreground">/</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Tauri
        </span>
        <span className="text-sm font-medium text-foreground">
          {settings?.tauriVersion ?? "-"}
        </span>
      </div>
      <div className="app-panel-surface rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={settings?.updates.autoUpdateEnabled ? "success" : "muted"}
          >
            {settings?.updates.autoUpdateEnabled
              ? "自动更新已启用"
              : "自动更新未启用"}
          </Badge>
        </div>
        <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
          {settings?.updates.message ??
            "当前通过 GitHub Releases 手动安装新版本。"}
        </p>
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void openExternal(settings?.updates.releasesUrl ?? "")
            }
            disabled={!settings?.updates.releasesUrl}
          >
            <IconExternalLink className="h-4 w-4" />
            查看 Releases
          </Button>
        </div>
      </div>
    </div>
  );
}
