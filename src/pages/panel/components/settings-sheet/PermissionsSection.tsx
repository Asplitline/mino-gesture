import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import type { SettingsSectionContentProps } from "./types";

function PermissionRow({
  label,
  description,
  granted,
  actionLabel,
  onAction,
}: {
  label: string;
  description: string;
  granted: boolean;
  actionLabel: string;
  onAction: () => Promise<void>;
}) {
  return (
    <div className="app-panel-subtle rounded-2xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <Badge variant={granted ? "success" : "dangerSoft"}>
              {granted ? "已授予" : "未授予"}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => void onAction()}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

export function PermissionsSection({
  settings,
  openTarget,
  refreshSettings,
}: SettingsSectionContentProps) {
  return (
    <div className="space-y-3">
      <PermissionRow
        label="辅助功能"
        description="用于监听全局鼠标事件和触发系统级操作。没有它，手势通常无法工作。"
        granted={Boolean(settings?.permissions.accessibility)}
        actionLabel="打开设置"
        onAction={async () => {
          await openTarget("accessibility");
          await refreshSettings();
        }}
      />
      <PermissionRow
        label="输入监控"
        description="用于提升全局输入监听稳定性。某些系统版本中建议同时开启。"
        granted={Boolean(settings?.permissions.inputMonitoring)}
        actionLabel="打开设置"
        onAction={async () => {
          await openTarget("input-monitoring");
          await refreshSettings();
        }}
      />
      <div className="app-panel-subtle rounded-2xl px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        授权后若状态没有立刻更新，通常需要完全重启应用。右上角刷新按钮会重新拉取检测结果。
      </div>
    </div>
  );
}
