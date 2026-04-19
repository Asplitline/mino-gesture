import { IconExternalLink } from "../../../../components/icons";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import type { SettingsSectionContentProps } from "./types";

export function UpdatesSection({
  settings,
  openExternal,
}: SettingsSectionContentProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="app-panel-subtle rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            App Version
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {settings?.version ?? "-"}
          </p>
        </div>
        <div className="app-panel-subtle rounded-2xl p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tauri Runtime
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {settings?.tauriVersion ?? "-"}
          </p>
        </div>
      </div>
      <div className="app-panel-surface rounded-[24px] p-5">
        <div className="flex items-center gap-2">
          <Badge
            variant={settings?.updates.autoUpdateEnabled ? "success" : "muted"}
          >
            {settings?.updates.autoUpdateEnabled
              ? "自动更新已启用"
              : "自动更新未启用"}
          </Badge>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {settings?.updates.message ??
            "当前通过 GitHub Releases 手动安装新版本。"}
        </p>
        <div className="mt-4">
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
