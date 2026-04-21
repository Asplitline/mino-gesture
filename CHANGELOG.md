<!--
  维护约定见 docs/CHANGELOG_GENERATION.md
  应用内「更新日志」由本文件解析渲染，勿在 TS 中重复维护条目列表。
-->

# 更新日志

## [0.1.6] - 2026-04-21

### 功能

- 无。

### 修复

- 修复规则编辑侧栏中下拉框在模态层内无法选择选项、点击空白无法关闭的问题。
- 调整下拉弹层挂载容器与层级，避免 `Sheet/Dialog` 与 `Select` 的嵌套交互冲突再次出现。

## [0.1.5] - 2026-04-21

### 功能

- 首次使用流程收拢：首页改为更清晰的两条开始路径，进入后默认回到规则面板。
- 新增关闭窗口行为设置，可选择最小化到托盘或直接退出，并支持从托盘重新打开主窗口。

### 修复

- 修复主窗口关闭后容易误以为应用已经退出的问题。
- 修复部分窄屏场景下设置面板与规则编辑界面的布局问题。

## [0.1.4] - 2026-04-19

### 功能

- 设置：侧栏「更新日志」并入「版本与更新」，同页查看版本、更新方式与解析自 `CHANGELOG.md` 的变更记录；相关布局与说明微调。
- 欢迎页与关于：首屏与信息展示小幅调整。

### 修复

- 更新日志：暂时隐藏「CHANGELOG 与当前应用版本」不一致时的顶部提示，减少误报。

## [0.1.3] - 2026-04-19

### 功能

- macOS 发行：GitHub Actions 工作流小幅调整。

### 修复

- 无。

## [0.1.2] - 2026-04-19

### 功能

- 无。

### 修复

- 同步 Cargo.lock 与发布版本信息，保证 CI 与本地可复现构建。

## [0.1.1] - 2026-04-19

### 功能

- 设置：全屏 Sheet（侧栏 + 内容区）；应用内展示根目录 `CHANGELOG.md`；附带 macOS 窗口与打包相关配置优化。

### 修复

- 无。

## [0.1.0] - 2026-04-19

### 功能

- 首版：中键/右键拖动手势、规则匹配与快捷键执行、规则管理与示例/恢复。
- 识别与调试信息（日志、最近结果、多显示器示意）；设置（自启动、权限、版本与关于、打开 Releases）。

### 修复

- 无。

[0.1.5]: https://github.com/Asplitline/mino-gesture/releases/tag/v0.1.5
[0.1.6]: https://github.com/Asplitline/mino-gesture/releases/tag/v0.1.6
[0.1.4]: https://github.com/Asplitline/mino-gesture/releases/tag/v0.1.4
[0.1.3]: https://github.com/Asplitline/mino-gesture/releases/tag/v0.1.3
[0.1.2]: https://github.com/Asplitline/mino-gesture/releases/tag/v0.1.2
[0.1.1]: https://github.com/Asplitline/mino-gesture/releases/tag/v0.1.1
[0.1.0]: https://github.com/Asplitline/mino-gesture/releases
