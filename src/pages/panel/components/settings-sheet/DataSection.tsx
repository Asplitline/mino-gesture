import { Button } from "../../../../components/ui/button";
import type { SettingsSectionContentProps } from "./types";

export function DataSection({
  onResetRules,
  resettingRules,
}: SettingsSectionContentProps) {
  return (
    <div className="app-panel-surface rounded-[24px] p-5">
      <p className="text-sm font-semibold text-foreground">恢复示例规则</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        这会覆盖当前规则列表，但不会影响权限、自动启动或应用本身的其他设置。
      </p>
      <div className="mt-4">
        <Button
          variant="outline"
          onClick={() => void onResetRules()}
          disabled={resettingRules}
        >
          {resettingRules ? "恢复中…" : "恢复示例数据"}
        </Button>
      </div>
    </div>
  );
}
