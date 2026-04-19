import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  IconExternalLink,
  IconInfo,
  IconRefreshCcw,
  IconRocket,
  IconSettings,
  IconShieldCheck,
} from "../../../components/icons";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../../components/ui/sheet";
import { Switch } from "../../../components/ui/switch";
import type { SettingsOverview } from "../../../types/app";

type SettingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResetRules: () => Promise<void>;
  resettingRules: boolean;
};

type SettingsSectionId =
  | "general"
  | "permissions"
  | "data"
  | "updates"
  | "about"
  | "changelog";

const CHANGELOG_ITEMS = [
  {
    version: "Unreleased",
    title: "设置中心",
    summary: "新增右侧设置入口，集中管理开机启动、权限检测、示例数据、版本更新、关于和更新日志。",
  },
  {
    version: "0.1.0",
    title: "规则面板重构",
    summary: "重做规则页布局与交互，统一卡片、抽屉和表单样式，提升信息密度和可读性。",
  },
  {
    version: "0.1.0",
    title: "日志与可视反馈",
    summary: "补齐识别日志、最近结果和屏幕映射等运行时反馈，便于排查手势识别与匹配情况。",
  },
];

const SECTIONS: Array<{
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: typeof IconSettings;
}> = [
  {
    id: "general",
    label: "通用",
    description: "自动启动等偏好",
    icon: IconRocket,
  },
  {
    id: "permissions",
    label: "权限",
    description: "辅助功能与输入监控",
    icon: IconShieldCheck,
  },
  {
    id: "data",
    label: "数据",
    description: "恢复示例数据",
    icon: IconSettings,
  },
  {
    id: "updates",
    label: "版本与更新",
    description: "版本号与更新方式",
    icon: IconRefreshCcw,
  },
  {
    id: "about",
    label: "关于",
    description: "作者与项目地址",
    icon: IconInfo,
  },
  {
    id: "changelog",
    label: "更新日志",
    description: "最近变更记录",
    icon: IconSettings,
  },
];

function SectionShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border/70 px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-foreground">{title}</h3>
        <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
    </div>
  );
}

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
            <Badge variant={granted ? "success" : "dangerSoft"}>{granted ? "已授予" : "未授予"}</Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => void onAction()}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

export function SettingsSheet({ open, onOpenChange, onResetRules, resettingRules }: SettingsSheetProps) {
  const [settings, setSettings] = useState<SettingsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("general");

  const refreshSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await invoke<SettingsOverview>("get_settings_overview");
      setSettings(next);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refreshSettings();
  }, [open, refreshSettings]);

  const toggleLaunchAtLogin = useCallback(async (checked: boolean) => {
    setLaunchBusy(true);
    setError(null);
    try {
      const next = await invoke<SettingsOverview>("set_launch_at_login", { enabled: checked });
      setSettings(next);
    } catch (err) {
      setError(String(err));
    } finally {
      setLaunchBusy(false);
    }
  }, []);

  const launchBadge = useMemo(() => {
    if (!settings?.launchAtLogin.available) return { text: "不可用", variant: "dangerSoft" as const };
    if (settings.launchAtLogin.enabled) return { text: "已启用", variant: "success" as const };
    return { text: "未启用", variant: "muted" as const };
  }, [settings]);

  const openTarget = useCallback(async (target: string) => {
    await invoke("open_settings_target", { target });
  }, []);

  const openExternal = useCallback(async (url: string) => {
    await invoke("open_external", { url });
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <SectionShell
            eyebrow="General"
            title="通用设置"
            description="管理应用启动方式和系统集成行为。"
          >
            <div className="space-y-4">
              <div className="app-panel-surface rounded-[24px] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">自动启动</p>
                      <Badge variant={launchBadge.variant}>{launchBadge.text}</Badge>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {settings?.launchAtLogin.message ?? "登录 macOS 后自动启动 Mino Gesture。"}
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(settings?.launchAtLogin.enabled)}
                    onCheckedChange={(checked) => void toggleLaunchAtLogin(checked)}
                    disabled={launchBusy || loading || !settings?.launchAtLogin.available}
                    aria-label="切换自动启动"
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => void openTarget("login-items")}>
                    打开登录项设置
                  </Button>
                </div>
              </div>
            </div>
          </SectionShell>
        );
      case "permissions":
        return (
          <SectionShell
            eyebrow="Permissions"
            title="权限与检测"
            description="应用依赖的系统权限，以及当前检测状态。"
          >
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
          </SectionShell>
        );
      case "data":
        return (
          <SectionShell
            eyebrow="Data"
            title="示例数据"
            description="恢复应用内置规则，快速回到初始可用状态。"
          >
            <div className="app-panel-surface rounded-[24px] p-5">
              <p className="text-sm font-semibold text-foreground">恢复示例规则</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                这会覆盖当前规则列表，但不会影响权限、自动启动或应用本身的其他设置。
              </p>
              <div className="mt-4">
                <Button variant="outline" onClick={() => void onResetRules()} disabled={resettingRules}>
                  {resettingRules ? "恢复中…" : "恢复示例数据"}
                </Button>
              </div>
            </div>
          </SectionShell>
        );
      case "updates":
        return (
          <SectionShell
            eyebrow="Version"
            title="版本与更新"
            description="查看当前版本，以及新版本的获取方式。"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="app-panel-subtle rounded-2xl p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">App Version</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{settings?.version ?? "-"}</p>
                </div>
                <div className="app-panel-subtle rounded-2xl p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tauri Runtime</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{settings?.tauriVersion ?? "-"}</p>
                </div>
              </div>
              <div className="app-panel-surface rounded-[24px] p-5">
                <div className="flex items-center gap-2">
                  <Badge variant={settings?.updates.autoUpdateEnabled ? "success" : "muted"}>
                    {settings?.updates.autoUpdateEnabled ? "自动更新已启用" : "自动更新未启用"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {settings?.updates.message ?? "当前通过 GitHub Releases 手动安装新版本。"}
                </p>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void openExternal(settings?.updates.releasesUrl ?? "")}
                    disabled={!settings?.updates.releasesUrl}
                  >
                    <IconExternalLink className="h-4 w-4" />
                    查看 Releases
                  </Button>
                </div>
              </div>
            </div>
          </SectionShell>
        );
      case "about":
        return (
          <SectionShell
            eyebrow="About"
            title="关于应用"
            description="产品基础信息、作者和仓库地址。"
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="app-panel-subtle rounded-2xl p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">App</p>
                  <p className="mt-2 text-base font-semibold text-foreground">{settings?.appName ?? "Mino Gesture"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{settings?.bundleIdentifier ?? "com.mino.gesture"}</p>
                </div>
                <div className="app-panel-subtle rounded-2xl p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Author</p>
                  <p className="mt-2 text-base font-semibold text-foreground">{settings?.about.author ?? "-"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{settings?.about.githubUrl ?? "-"}</p>
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
          </SectionShell>
        );
      case "changelog":
        return (
          <SectionShell
            eyebrow="Changelog"
            title="更新日志"
            description="当前版本阶段的主要改动。"
          >
            <div className="space-y-3">
              {CHANGELOG_ITEMS.map((item) => (
                <div key={`${item.version}-${item.title}`} className="app-panel-subtle rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <Badge variant="info">{item.version}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
                </div>
              ))}
            </div>
          </SectionShell>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="fullscreen"
        className="flex min-h-0 flex-col gap-0 bg-card p-0"
      >
        <SheetHeader className="border-b border-border/70">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div>
              <SheetTitle>设置</SheetTitle>
              <SheetDescription>偏好设置采用左侧菜单和右侧内容区，不再堆叠成长列表。</SheetDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => void refreshSettings()} disabled={loading}>
              <IconRefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </SheetHeader>
        <SheetBody className="px-0 py-0">
          {error ? (
            <div className="border-b border-destructive/20 bg-destructive/10 px-6 py-3 text-sm text-destructive">{error}</div>
          ) : null}
          <div className="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)]">
            <aside className="min-h-0 border-r border-border/70 bg-muted/25 px-3 py-4">
              <nav className="space-y-1">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const active = section.id === activeSection;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={[
                        "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                        active
                          ? "bg-card text-foreground shadow-sm ring-1 ring-border/70"
                          : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
                      ].join(" ")}
                    >
                      <span className={`mt-0.5 rounded-xl p-2 ${active ? "bg-primary/12 text-primary" : "bg-background text-muted-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{section.label}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed opacity-80">{section.description}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>
            <section className="min-h-0 bg-card">{renderContent()}</section>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
