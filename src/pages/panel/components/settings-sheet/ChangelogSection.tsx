import { Badge } from "../../../../components/ui/badge";

const CHANGELOG_ITEMS = [
  {
    version: "Unreleased",
    title: "设置中心",
    summary:
      "新增右侧设置入口，集中管理开机启动、权限检测、示例数据、版本更新、关于和更新日志。",
  },
  {
    version: "0.1.0",
    title: "规则面板重构",
    summary:
      "重做规则页布局与交互，统一卡片、抽屉和表单样式，提升信息密度和可读性。",
  },
  {
    version: "0.1.0",
    title: "日志与可视反馈",
    summary:
      "补齐识别日志、最近结果和屏幕映射等运行时反馈，便于排查手势识别与匹配情况。",
  },
];

export function ChangelogSection() {
  return (
    <div className="space-y-3">
      {CHANGELOG_ITEMS.map((item) => (
        <div
          key={`${item.version}-${item.title}`}
          className="app-panel-subtle rounded-2xl p-4"
        >
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {item.title}
            </p>
            <Badge variant="info">{item.version}</Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {item.summary}
          </p>
        </div>
      ))}
    </div>
  );
}
