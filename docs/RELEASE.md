# Tauri macOS 发布与 GitHub Release 版本管理技术文档

## 1. 文档目标

本文档定义当前阶段的 macOS 发布方案，适用于以下约束：

* 技术栈：Rust + Tauri
* 发布平台：仅 macOS
* 版本管理：GitHub Release
* CI/CD：GitHub Actions
* Apple 开发者状态：暂时没有付费 Apple Developer 账号
* 发布目标：先实现可持续迭代的版本发布与分发，不追求商店上架与完整系统信任链

本文档给出的方案以“当前可执行、工程成本低、维护简单”为原则，优先保证：

1. 版本号统一
2. 构建流程可复现
3. Release 产物可追踪
4. 用户可下载安装
5. 应用内可以检测新版本并跳转下载页

---

## 2. 当前阶段的发布结论

当前阶段采用以下方案：

**SemVer 版本号 + Git tag + GitHub Actions 自动构建 + GitHub Release 托管 DMG + 应用内检查更新并跳转 Release 页面**

这套方案的特点：

* 版本源唯一：Git tag
* 发布入口统一：GitHub Release
* 构建自动化：GitHub Actions
* 安装包格式：DMG
* 更新方式：用户下载新版本并覆盖安装
* 应用内体验：只做“发现新版本”和“打开下载页”，暂不做自动下载替换

这是当前阶段最稳妥的方案。

---

## 3. 方案边界与限制

### 3.1 当前能做到的能力

当前方案可以稳定实现：

* 通过 tag 驱动发版
* 自动构建 macOS 安装包
* 自动上传 Release 资产
* 统一发布说明
* 提供 latest 页面作为对外下载入口
* 应用内检查 stable 最新版本

### 3.2 当前明确不做的能力

当前阶段不做以下能力：

* notarization
* Developer ID 正式签名
* Mac App Store 上架
* Tauri Updater 真正的应用内无感更新
* 差分更新

### 3.3 当前用户安装体验限制

由于没有付费 Apple Developer 账号，当前无法完成 notarization。因此用户首次打开从互联网下载的应用时，仍然可能需要在系统的 Privacy & Security 中手动放行。

这不是构建链路问题，而是当前 Apple 账号能力边界。

---

## 4. 总体架构

整体发布链路如下：

```text
开发提交代码
  -> 更新版本号
  -> 创建 Git tag（例如 v0.3.0）
  -> push tag 到 GitHub
  -> GitHub Actions 触发
  -> macOS runner 构建 Tauri 应用
  -> 输出 .app / .dmg
  -> 上传到 GitHub Release
  -> 用户从 Release 页面下载 .dmg
  -> 拖入 Applications 安装
  -> 应用内通过 GitHub Release API 检查最新版本
  -> 发现新版本后跳转到 Release 页面
```

### 核心原则

* Git tag 是“版本事实来源”
* GitHub Release 是“对外发布事实来源”
* CI 只负责从代码生成产物，不手动拼接版本号
* 应用运行时只读取 Release，不依赖自建更新服务

---

## 5. 版本策略

### 5.1 版本规范

采用语义化版本号：

* `v0.1.0`
* `v0.1.1`
* `v0.2.0`
* `v0.2.1-beta.1`
* `v0.2.1-beta.2`

规则：

* `MAJOR`：不兼容变更
* `MINOR`：兼容性功能新增
* `PATCH`：兼容性修复
* `-beta.N`：预发布版本

### 5.2 通道策略

当前定义两个通道：

#### Stable

正式发布给普通用户的版本：

* `v0.1.0`
* `v0.1.1`
* `v0.2.0`

#### Beta

面向测试用户的版本：

* `v0.3.0-beta.1`
* `v0.3.0-beta.2`

### 5.3 latest 规则

GitHub 的 latest release 天然适合 stable 通道。

因此当前约定：

* stable 版本发布为正式 Release
* beta 版本发布为 Pre-release
* 应用内默认只检查 stable 最新版本

这样能保证普通用户拿到的是最近一个正式版，而不是 beta。

---

## 6. 仓库结构建议

建议仓库包含以下关键文件：

```text
.
├── src-tauri/
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   └── icons/
├── src/
├── package.json
├── .github/
│   └── workflows/
│       └── release-macos.yml
├── CHANGELOG.md
└── README.md
```

### 关键文件职责

* `src-tauri/tauri.conf.json`：Tauri 发布配置
* `src-tauri/Cargo.toml`：Rust 包版本信息
* `package.json`：前端版本信息与构建脚本
* `.github/workflows/release-macos.yml`：发版工作流
* `CHANGELOG.md`：版本变更记录

---

## 7. Tauri 配置规范

### 7.1 基础配置

建议在 `src-tauri/tauri.conf.json` 中至少明确这些字段：

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "YourApp",
  "version": "0.1.0",
  "identifier": "com.yourcompany.yourapp",
  "build": {
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": ["app", "dmg"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns"
    ],
    "macOS": {
      "minimumSystemVersion": "12.0",
      "signingIdentity": "-"
    }
  }
}
```

### 7.2 当前阶段为什么使用 `signingIdentity: "-"`

当前阶段采用 ad-hoc signing：

* 可以完成最基本的签名流程
* 适合当前没有正式 Apple 签名能力的阶段
* 能让 Apple Silicon 设备上的安装体验更稳定一些
* 仍然需要用户首次手动放行

### 7.3 版本号一致性要求

建议将这些位置的版本号保持一致：

* `package.json`
* `src-tauri/tauri.conf.json`
* `src-tauri/Cargo.toml`

推荐做法：

* 以 `src-tauri/Cargo.toml` 或 `tauri.conf.json` 为主版本源
* 发布前统一执行版本升级脚本
* 禁止只改其中一个文件

---

## 8. 本地构建规范

### 8.1 本地构建命令

当前只考虑 macOS：

```bash
cargo tauri build --bundles app,dmg
```

如果要构建通用包：

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
cargo tauri build --target universal-apple-darwin --bundles app,dmg
```

### 8.2 构建产物

默认会在 `src-tauri/target/` 下生成产物，常见包括：

* `.app`
* `.dmg`

实际对外分发使用 `.dmg`。

`.app` 作为内部调试或排查问题时的辅助产物保留。

### 8.3 当前推荐的构建目标

当前推荐：

**优先构建 `universal-apple-darwin`**

原因：

* 同时覆盖 Intel 与 Apple Silicon
* Release 页面只维护一份主安装包
* 降低用户选择成本

如果你的项目暂时在 universal 构建上存在兼容问题，可以先退一步：

* 分别构建 `aarch64-apple-darwin`
* 分别构建 `x86_64-apple-darwin`
* Release 页面同时上传两个 DMG

但第一优先级仍然是统一为 universal。

---

## 9. GitHub Release 设计

### 9.1 Release 作为单一下载源

当前约定 GitHub Release 承担三类职责：

1. 版本发布记录
2. 二进制下载源
3. 变更说明展示入口

### 9.2 Release 命名规范

建议：

* Tag：`v0.3.0`
* Release title：`v0.3.0`

beta 版本：

* Tag：`v0.4.0-beta.1`
* Release title：`v0.4.0-beta.1`
* 同时勾选 `Pre-release`

### 9.3 Release 资产命名规范

建议上传产物文件名包含：

* 应用名
* 版本号
* 平台信息
* 架构信息（如果不是 universal）

建议命名：

```text
YourApp_0.3.0_universal.dmg
YourApp_0.3.0_aarch64.dmg
YourApp_0.3.0_x64.dmg
```

如果使用 tauri-action 的默认命名，也可以先接受默认规则，后续再统一优化。

### 9.4 Release notes 规范

推荐模板：

```md
## 更新内容
- 新增：...
- 优化：...
- 修复：...

## 安装说明
1. 下载 DMG
2. 拖动应用到 Applications
3. 首次打开时，如果系统拦截，请前往 Privacy & Security 放行

## 已知限制
- 当前版本未 notarize
- 首次安装可能需要手动确认
```

---

## 10. CI/CD 方案

### 10.1 触发方式

当前采用 **tag 驱动发版**：

* 创建并推送 `v*` tag
* GitHub Actions 自动触发
* 自动构建 macOS 安装包
* 自动创建或更新对应 GitHub Release

### 10.2 推荐原因

tag 驱动优于 release 分支驱动，原因有三点：

1. 版本语义更清晰
2. 发版动作更显式
3. Release 与源码提交点绑定更直接

### 10.3 GitHub Actions 工作流示例

创建文件：`.github/workflows/release-macos.yml`

```yaml
name: release-macos

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: release-macos-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-macos:
    runs-on: macos-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: pnpm

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: aarch64-apple-darwin,x86_64-apple-darwin

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'

      - name: Install frontend dependencies
        run: pnpm install --frozen-lockfile

      - name: Build and upload release
        uses: tauri-apps/tauri-action@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: ${{ github.ref_name }}
          releaseBody: 'See the assets to download and install this version.'
          releaseDraft: false
          prerelease: ${{ contains(github.ref_name, '-beta.') }}
          args: --target universal-apple-darwin
```

### 10.4 这份工作流的职责

这份工作流负责：

* 在 macOS runner 上执行构建
* 安装 Node、pnpm、Rust
* 安装 universal 构建需要的两个 Rust target
* 调用 `tauri-action` 执行 Tauri build
* 将构建产物上传到 GitHub Release
* 自动区分 stable 和 beta

### 10.5 为什么这里用 `github.ref_name`

因为工作流由 tag 触发时，`github.ref_name` 就是 tag 的短名称，例如：

* `v0.3.0`
* `v0.4.0-beta.1`

这样 release 名称、tag 名称、应用版本关联更直接。

---

## 11. 发版操作流程

### 11.1 发 stable 版本

#### 步骤 1：更新版本号

同步更新：

* `package.json`
* `src-tauri/tauri.conf.json`
* `src-tauri/Cargo.toml`
* `CHANGELOG.md`

#### 步骤 2：提交版本变更

```bash
git add .
git commit -m "release: v0.3.0"
```

#### 步骤 3：打 tag 并推送

```bash
git tag v0.3.0
git push origin main
git push origin v0.3.0
```

#### 步骤 4：等待 Actions 完成

GitHub Actions 会自动：

* 构建 macOS 包
* 创建对应 Release
* 上传产物

#### 步骤 5：检查 Release 页面

确认：

* Release 标题正确
* DMG 已上传
* 说明文本正确
* 非 beta 版本未标记为 pre-release

### 11.2 发 beta 版本

```bash
git tag v0.4.0-beta.1
git push origin v0.4.0-beta.1
```

工作流会自动把该版本标记为 pre-release。

---

## 12. 下载页与对外链接策略

### 12.1 官网下载入口

官网推荐使用这两个链接：

#### 最新正式版页面

```text
https://github.com/<owner>/<repo>/releases/latest
```

#### 某个固定版本页面

```text
https://github.com/<owner>/<repo>/releases/tag/v0.3.0
```

### 12.2 资源直链

如果你能稳定控制资产命名，还可以使用 latest download 直链：

```text
https://github.com/<owner>/<repo>/releases/latest/download/YourApp_0.3.0_universal.dmg
```

但要注意：

* latest download 直链依赖资产文件名稳定
* 文件名策略改变后，直链会失效

因此当前阶段更推荐：

* 官网按钮跳到 `releases/latest`
* 用户在页面里点击下载

这比强依赖文件名更稳。

---

## 13. 应用内更新检查方案

### 13.1 当前阶段的更新策略

当前不做真正的自动更新安装，采用以下方案：

1. 应用启动时或用户手动点击“检查更新”
2. 请求 GitHub Releases API 获取 latest stable release
3. 比较当前版本与线上版本
4. 如果发现新版本，弹窗提示
5. 用户点击“前往下载”
6. 打开 GitHub Release 页面

### 13.2 为什么不直接接 Tauri Updater

当前阶段不接 Tauri Updater，原因：

* 你现在没有付费 Apple Developer 账号
* 当前不准备做 notarization
* 当前版本管理重点是“可发布、可下载、可追踪”
* 自动更新链路会引入额外签名、公钥、更新产物和更多故障点

所以当前最优策略是：

**检查更新 + 跳转下载页**

### 13.3 GitHub API 设计

使用 endpoint：

```text
GET https://api.github.com/repos/<owner>/<repo>/releases/latest
```

这会返回最近一个正式 Release，不包含 draft 和 prerelease。

因此它天然适合 stable 更新检测。

### 13.4 返回字段关注点

主要读取：

* `tag_name`
* `html_url`
* `body`
* `assets`

推荐最少使用：

* `tag_name`：用于版本比较
* `html_url`：用于跳转下载页面

### 13.5 前端示例实现

假设你在前端里通过 Tauri WebView 发起请求：

```ts
const REPO_OWNER = 'your-name'
const REPO_NAME = 'your-repo'

export async function fetchLatestRelease() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
    {
      headers: {
        Accept: 'application/vnd.github+json'
      }
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch latest release: ${res.status}`)
  }

  return res.json()
}
```

版本比较示例：

```ts
function normalizeVersion(input: string) {
  return input.replace(/^v/, '')
}

function compareSemver(a: string, b: string) {
  const pa = normalizeVersion(a).split('-')[0].split('.').map(Number)
  const pb = normalizeVersion(b).split('-')[0].split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff
  }

  return 0
}
```

检查更新示例：

```ts
import { version } from '@tauri-apps/plugin-app'
import { openUrl } from '@tauri-apps/plugin-opener'

export async function checkForUpdate() {
  const currentVersion = await version()
  const latest = await fetchLatestRelease()
  const latestVersion = normalizeVersion(latest.tag_name)

  if (compareSemver(latestVersion, currentVersion) > 0) {
    return {
      hasUpdate: true,
      latestVersion,
      url: latest.html_url,
      body: latest.body
    }
  }

  return {
    hasUpdate: false,
    latestVersion,
    url: latest.html_url,
    body: latest.body
  }
}

export async function goToDownloadPage(url: string) {
  await openUrl(url)
}
```

### 13.6 UI 建议

在应用中放两个入口：

#### 自动检查

* 应用启动后延迟检查一次
* 只提示 stable 用户

#### 手动检查

菜单：

* `帮助 -> 检查更新`

弹窗建议内容：

```text
发现新版本 v0.3.1
当前版本：v0.3.0

本次更新：
- 修复启动崩溃
- 优化窗口记忆
- 调整菜单行为

[前往下载] [稍后]
```

---

## 14. 安装与升级说明

### 14.1 首次安装说明

用户安装流程：

1. 下载 `.dmg`
2. 打开 DMG
3. 将应用拖入 `Applications`
4. 首次打开若被拦截，前往系统设置放行

### 14.2 升级说明

当前升级采用覆盖安装：

1. 下载新版本 DMG
2. 打开 DMG
3. 将新版本 App 拖到 `Applications`
4. 覆盖原应用

### 14.3 官网文案建议

建议在下载页面明确写出：

```md
macOS 安装说明
1. 下载 DMG 文件
2. 将应用拖入 Applications
3. 首次打开时，如果系统提示安全限制，请到 Privacy & Security 中允许打开
4. 后续版本通过覆盖安装升级
```

---

## 15. 发布检查清单

### 发版前检查

* [ ] 版本号已同步更新
* [ ] CHANGELOG 已更新
* [ ] 图标与应用名正确
* [ ] 本地至少成功构建过一次
* [ ] 主分支代码已合并完成
* [ ] beta / stable 标记策略明确

### CI 检查

* [ ] workflow 成功触发
* [ ] macOS build 成功
* [ ] Release 成功创建
* [ ] DMG 成功上传

### 发布后检查

* [ ] latest 页面可访问
* [ ] DMG 可下载
* [ ] 应用能正常打开
* [ ] 应用内检查更新能识别到最新版本
* [ ] beta 版本未污染 stable latest

---

## 16. 常见故障与排查

### 16.1 Actions 没有触发

重点检查：

* tag 是否符合 `v*`
* workflow 文件是否在默认分支
* push 的是否是 tag，而不只是本地创建

### 16.2 Release 创建了但没有资产

重点检查：

* `tauri-action` 是否执行成功
* `beforeBuildCommand` 是否失败
* 前端 dist 是否正确生成
* `bundle.targets` 是否包含 `dmg`

### 16.3 用户打开应用被系统拦截

这是当前阶段预期行为之一。

处理方式：

* 下载页明确说明
* 应用内首次启动帮助文档里说明
* 用户到 Privacy & Security 手动放行

### 16.4 latest 检测拿到的不是 beta

这是预期行为。

因为 GitHub latest 针对的是最近一个正式 Release，而不是 prerelease。

如果未来要支持 beta 通道，就需要额外维护 beta 端点或使用单独的 release 策略。

### 16.5 版本比较出错

常见原因：

* 本地版本是 `0.3.0`
* 远程 tag 是 `v0.3.0`
* 比较前没有去掉前缀 `v`

解决方式：

* 统一比较前 `normalizeVersion`

---

## 17. 安全与运维建议

### 17.1 当前阶段的安全定位

当前方案的安全等级是：

**适合独立开发、测试分发、早期公开发布**

它的优势在于：

* 发布链路简单
* 版本来源清晰
* 可追踪性强
* 工程负担轻

### 17.2 当前最重要的运维纪律

* 每次发版必须通过 tag 触发
* 不允许手工上传“无源码对应关系”的安装包
* Release 说明必须写明当前限制
* beta 与 stable 严格分离

### 17.3 GitHub Token 原则

当前 workflow 只需使用仓库默认 `GITHUB_TOKEN`。

不需要额外引入个人 PAT。

---

## 18. 后续升级路径

当你后续有付费 Apple Developer 账号后，按下面顺序升级：

### 阶段一：补正式签名

* 申请 `Developer ID Application`
* 配置 `APPLE_SIGNING_IDENTITY`
* 在 CI 中导入证书

### 阶段二：补 notarization

* 配置 `APPLE_ID / APPLE_PASSWORD / APPLE_TEAM_ID`
  或
* 配置 `APPLE_API_KEY / APPLE_API_ISSUER / APPLE_API_KEY_PATH`

### 阶段三：接入真正的自动更新

* 打开 Tauri Updater
* 生成 updater 公私钥
* 产出更新包和签名文件
* 基于 GitHub Release 或静态 JSON 提供更新元数据

### 阶段四：再考虑更高级分发

* Homebrew Cask
* Mac App Store
* 自定义下载页与更新服务

---

## 19. 最终落地建议

当前阶段直接落地以下组合：

### 当前标准方案

* 平台：macOS
* 版本号：SemVer
* 触发：Git tag
* CI/CD：GitHub Actions
* 构建：Tauri + universal-apple-darwin
* 分发：GitHub Release
* 安装包：DMG
* 更新：检查最新版本并跳转下载页
* 签名：ad-hoc signing

### 当前一句话执行策略

**先把“能稳定发版、能稳定下载、能稳定迭代”这件事做扎实，再在后续逐步升级到正式签名、notarization 和自动更新。**

