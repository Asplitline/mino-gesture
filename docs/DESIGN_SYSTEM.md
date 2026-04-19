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

## Component Rules

1. 类似卡片的外层容器，优先使用组件库的 `Card / CardHeader / CardContent / CardFooter`，不要再手写 `div/section + border + bg + shadow` 来模拟卡片。
2. 类似状态标签、状态 pill、计数标签，优先使用组件库的 `Badge`。如果现有 variant 不够，先补 `Badge` variant，再在业务里使用，不要每处手写圆角和配色。
3. `Sheet` 采用统一结构：`SheetHeader / SheetBody / SheetFooter`。内边距、滚动区和头尾节奏应放在组件层，不在业务页面里重复写 `px/py` 常量。
4. `Sheet` 的头、中、尾使用统一面板底色，不做“上白中灰下白”的三段分层背景。头尾主要负责分割线和布局，不单独制造新的背景层。
5. `Sheet` 头部默认与“新建规则”对齐：优先使用标题 + 描述的结构，不在同层随意添加图标、额外卡片或突兀的大块摘要。
6. 按钮优先使用组件库 `Button` 的现有 `variant` 和 `size`。如果主次关系不清晰，应先扩展按钮变体，而不是在业务里手写一套按钮外观。
7. 输入类控件优先使用组件库现有原语：`Input`、`Select`、`Switch`、`Dialog`、`Sheet`。不要在业务里重新拼一套“像输入框/下拉/开关/弹层”的壳。
8. 当某种 UI 模式在两个以上地方重复出现时，不论它是不是完整组件，都应提升为可复用能力。可复用能力包括：
   - 组件库组件
   - 组件库 variant
   - 通用语义类
   - 组合型局部组件
9. “可复用能力”不限于 `Card` 和 `Badge`。像下面这些都应该按同样原则处理：
   - 标题区
   - 工具栏
   - 摘要条
   - 空状态
   - 状态行
   - 统计块
   - 操作区
   - 键帽序列
   - 表单字段块
10. 业务组件应该优先负责内容结构和业务逻辑，不负责重新定义基础视觉原语。凡是出现“这块到处都长得像同一种东西”，都应先回到组件层处理。

## Interaction Rules

1. 高频主操作保持明确，例如“新建规则”。
2. 低频、恢复性、危险边缘但非 destructive 的操作，降低存在感，优先使用更弱的按钮样式，如 `ghost`，并使用更直接可理解的文案。
3. 动效以轻量为主，优先在基础组件层统一定义，不在业务组件里分散追加。

## Tailwind First

1. 字体、间距、布局、圆角、常规状态优先使用 Tailwind 原生类。
2. 只有当 Tailwind 默认能力不足以表达项目的稳定视觉语言时，才提升到全局 token 或组件封装。
3. 一旦某种视觉模式在两个以上业务位置重复出现，应优先考虑进入组件库或通用语义类，而不是继续复制样式字符串。
4. 判断顺序固定为：
   - 先看组件库里有没有现成组件
   - 再看现有组件能不能补 variant / size / slot
   - 再看是否需要通用语义类
   - 最后才允许业务内局部手写
5. 业务内局部手写样式只能用于一次性、强业务语义、短生命周期的例外场景；一旦复用，就必须抽离。
