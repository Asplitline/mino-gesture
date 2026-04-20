# mino-gesture

[English](./README.md)

一个面向 macOS 的轻量鼠标手势工具，使用 Tauri、Rust、React 和 TypeScript 构建。

mino-gesture 的目标很直接：把少量高频动作做得足够顺手，而不是变成一个庞大的自动化平台。当前版本聚焦于鼠标按键拖动手势、快捷键触发、基础设置，以及一个简洁可用的配置界面。

## 当前功能

- 支持按住鼠标中键或右键拖动，释放后识别手势。
- 支持 `U / D / L / R` 及其组合手势。
- 内置一组开箱即用的示例规则：
  - 中键上滑打开 Mission Control
  - 中键左右滑切换 Space
  - 右键左右滑执行浏览器前进 / 后退
- 支持创建、编辑、启用、停用、删除和重置规则。
- 支持为规则录入自定义快捷键。
- 支持查看最近识别结果和识别日志。
- 支持检测辅助功能与输入监控权限状态。
- 支持设置开机启动。
- 支持设置关闭主窗口时最小化到托盘，或直接退出。
- 设置页内可查看版本信息、更新方式、更新日志和项目地址。

## 当前范围

当前版本是一个已可用的 macOS 桌面工具，但功能边界仍然刻意收窄：

- 目前动作类型以快捷键触发为主。
- 当前重点是全局规则与内置常用场景，不强调复杂自动化。
- 更新方式目前为通过 GitHub Releases 手动安装新版本，未接入自动更新。

如果你在寻找的是窗口管理器、脚本平台、插件系统或跨平台输入工具，这个项目当前并不是那个方向。

## 安装

当前建议从 GitHub Releases 获取构建产物：

- Releases: <https://github.com/Asplitline/mino-gesture/releases>

下载后将应用拖入 `/Applications`，首次运行时按系统提示授予权限。

## 权限要求

mino-gesture 在 macOS 上依赖以下权限：

- 辅助功能（Accessibility）
- 输入监控（Input Monitoring）

如果缺少这些权限，应用可能无法捕获全局鼠标事件，手势也不会生效。

开发模式下，权限通常需要授予给启动 `pnpm tauri dev` 的宿主应用，例如：

- Terminal
- iTerm
- Cursor
- VS Code

更详细的排查说明见 [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)。

## 开发

### 环境要求

- macOS
- Rust toolchain
- pnpm
- Xcode Command Line Tools

### 安装依赖

```bash
pnpm install
```

### 常用命令

```bash
pnpm tauri dev
pnpm build
pnpm tauri build
```

### 版本与发版

```bash
pnpm run release:patch
pnpm run release:minor
pnpm run release:major
```

版本号与 changelog 的维护约定见 [docs/RELEASE.md](./docs/RELEASE.md) 和 [docs/CHANGELOG_GENERATION.md](./docs/CHANGELOG_GENERATION.md)。

## 配置与数据

应用会在 macOS 的应用支持目录中保存配置。首次启动会自动生成默认规则和默认动作。

当前内置的默认规则主要覆盖：

- Mission Control
- Space 切换
- 浏览器前进 / 后退

如果你改乱了规则，可以在设置页里直接重置为内置内容。

## 技术栈

- Tauri 2
- Rust
- React 19
- TypeScript
- Vite
- Tailwind CSS

## 文档

- [docs/CURRENT_FEATURES.md](./docs/CURRENT_FEATURES.md)
- [docs/TECH_DESIGN.md](./docs/TECH_DESIGN.md)
- [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md)
- [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- [docs/RELEASE.md](./docs/RELEASE.md)
- [docs/CHANGELOG_GENERATION.md](./docs/CHANGELOG_GENERATION.md)

## 项目状态

当前版本号：`0.1.5`

README 会优先描述“已经可用的内容”，而不是远期设想。
