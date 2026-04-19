# Design System

## Current Inventory

项目里原先分散存在三类背景写法：

1. 页面主背景
`PageLayout` 里直接写死的页面渐变背景。

2. 次级背景
Header / Footer 毛玻璃、空状态步骤块、日志空状态、Muted 区块，分别混用了 `bg-background/80`、`bg-background/65`、`bg-muted/20`、`bg-muted/35`。

3. 卡片背景
规则卡、最近识别、屏幕布局、加载态、空状态都重复写了 `bg-[rgba(255,255,255,0.82)]` 和相近阴影。

字体大小也存在分散问题：

1. 主正文主要是 `text-sm`
2. 次级说明主要是 `text-xs`
3. 一部分紧凑说明直接写成了 `text-[11px]`、`text-[0.74rem]`、`text-[0.82rem]`

## Canonical Tokens

这些 token 定义在 [src/index.css](/Users/shouyong/myqz/code/mino-gesture/src/index.css:7)。

### Surface

- `--surface-primary`: 主背景
- `--surface-secondary`: 次级背景
- `--surface-card`: 卡片背景
- `--surface-card-soft`: 更轻的卡片/子层背景

### Brand

- `--brand-primary`: 主主题色
- `--brand-secondary`: 次级主题色

### Typography

- 优先使用 Tailwind 原生字号尺度
- 标题优先使用 `text-lg` / `text-base`
- 常规正文优先使用 `text-sm`
- 次级说明、注释、计数优先使用 `text-xs`

## Canonical Classes

这些语义类同样定义在 [src/index.css](/Users/shouyong/myqz/code/mino-gesture/src/index.css:56)。

- `app-page-surface`: 页面主背景
- `app-chrome-surface`: Header / Footer / 顶底栏背景
- `app-panel-surface`: 标准卡片背景
- `app-panel-surface-interactive`: 标准卡片悬停态
- `app-panel-subtle`: 次级块背景
- `app-keycap-surface`: 键帽背景
## Usage Rules

1. 页面容器只用 `app-page-surface`，不要再写局部渐变。
2. 规则卡、侧栏卡片、加载态、空状态优先用 `app-panel-surface`。
3. 辅助步骤块、空状态内嵌块、统计中性卡优先用 `app-panel-subtle`。
4. 字号优先使用 Tailwind 原生尺度：`text-xs / text-sm / text-base / text-lg`。
5. 只有当 Tailwind 默认颜色不满足设计表达时，才在 token 层补充颜色变量或配置。
6. 不再新增 `bg-[rgba(...)]`、`text-[11px]`、`text-[0.74rem]` 这类散点值，除非是非常明确的特殊视觉需求。
