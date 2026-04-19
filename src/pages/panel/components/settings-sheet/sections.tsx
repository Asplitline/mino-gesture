import {
  IconInfo,
  IconRefreshCcw,
  IconRocket,
  IconSettings,
  IconShieldCheck,
} from "../../../../components/icons";
import { AboutSection } from "./AboutSection";
import { ChangelogSection } from "./ChangelogSection";
import { DataSection } from "./DataSection";
import { GeneralSection } from "./GeneralSection";
import { PermissionsSection } from "./PermissionsSection";
import type { SettingsSectionDefinition } from "./types";
import { UpdatesSection } from "./UpdatesSection";

export const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
  {
    id: "general",
    label: "通用",
    description: "自动启动等偏好",
    icon: IconRocket,
    eyebrow: "General",
    title: "通用设置",
    panelDescription: "管理应用启动方式和系统集成行为。",
    render: (props) => <GeneralSection {...props} />,
  },
  {
    id: "permissions",
    label: "权限",
    description: "辅助功能与输入监控",
    icon: IconShieldCheck,
    eyebrow: "Permissions",
    title: "权限与检测",
    panelDescription: "应用依赖的系统权限，以及当前检测状态。",
    render: (props) => <PermissionsSection {...props} />,
  },
  {
    id: "data",
    label: "数据",
    description: "恢复示例数据",
    icon: IconSettings,
    eyebrow: "Data",
    title: "示例数据",
    panelDescription: "恢复应用内置规则，快速回到初始可用状态。",
    render: (props) => <DataSection {...props} />,
  },
  {
    id: "updates",
    label: "版本与更新",
    description: "版本号与更新方式",
    icon: IconRefreshCcw,
    eyebrow: "Version",
    title: "版本与更新",
    panelDescription: "查看当前版本，以及新版本的获取方式。",
    render: (props) => <UpdatesSection {...props} />,
  },
  {
    id: "about",
    label: "关于",
    description: "作者与项目地址",
    icon: IconInfo,
    eyebrow: "About",
    title: "关于应用",
    panelDescription: "产品基础信息、作者和仓库地址。",
    render: (props) => <AboutSection {...props} />,
  },
  {
    id: "changelog",
    label: "更新日志",
    description: "功能与修复",
    icon: IconSettings,
    eyebrow: "Changelog",
    title: "更新日志",
    panelDescription:
      "正文来自根目录 CHANGELOG.md，按「功能 / 修复」记录版本变更；维护方式见 docs/CHANGELOG_GENERATION.md。",
    render: () => <ChangelogSection />,
  },
];
