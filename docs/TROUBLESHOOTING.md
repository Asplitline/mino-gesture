# mino-gesture 故障排查指南

## 问题：按下中键没有日志输出

### 根本原因

**macOS 会静默忽略 rdev 的事件回调，如果应用没有被授予辅助功能权限。**

这是 rdev 在 macOS 上的已知行为：
- 不会抛出错误
- 不会有任何提示
- 回调函数根本不会被调用
- 应用看起来正常运行，但实际上无法捕获任何鼠标/键盘事件

---

## 解决方案：授予系统权限

### 步骤 1：打开系统设置

1. 点击屏幕左上角的  菜单
2. 选择"系统设置..."（System Settings）

### 步骤 2：授予辅助功能权限

1. 进入 **隐私与安全性** (Privacy & Security)
2. 点击 **辅助功能** (Accessibility)
3. 查找以下应用之一：
   - `mino-gesture`（如果是打包后的应用）
   - `Terminal.app`（如果通过终端运行 `pnpm tauri dev`）
   - `iTerm.app`（如果使用 iTerm）
   - `Cursor`（如果通过 Cursor 终端运行）

4. 如果应用不在列表中：
   - 点击左下角的 **🔒 锁图标** 解锁
   - 点击 **+** 按钮
   - 导航到 `/Applications/` 找到对应的应用
   - 添加并勾选启用

### 步骤 3：授予输入监控权限（可选但推荐）

1. 在"隐私与安全性"中
2. 点击 **输入监控** (Input Monitoring)
3. 重复上述步骤添加应用

### 步骤 4：重启应用

授予权限后，**必须完全重启应用**：

```bash
# 停止当前运行的 dev 服务器（Ctrl+C）
# 然后重新启动
pnpm tauri dev
```

---

## 验证权限是否生效

### 方法 1：查看日志

启动应用后，应该看到：

```
INFO mino_gesture_lib::platform::mouse_listener: middle-button listener thread started
INFO mino_gesture_lib::platform::mouse_listener: starting rdev::listen...
INFO mino_gesture_lib::platform::mouse_listener: rdev listener is receiving events
```

然后移动鼠标或点击任意按键，应该看到：

```
INFO mino_gesture_lib::platform::mouse_listener: button pressed: Left
INFO mino_gesture_lib::platform::mouse_listener: button pressed: Right
```

### 方法 2：测试中键手势

1. 按住鼠标中键（滚轮按键）
2. 向上移动鼠标
3. 释放中键

应该看到日志：

```
INFO mino_gesture_lib::platform::mouse_listener: middle-button pressed at (123.4, 567.8)
INFO mino_gesture_lib::platform::mouse_listener: middle-button release detected
INFO mino_gesture_lib::platform::mouse_listener: middle-button released, collected 45 points
INFO mino_gesture_lib::platform::mouse_listener: middle-button gesture completed gesture=U scope=global matched=true
```

### 方法 3：使用 UI 调试面板

如果中键仍然不工作，可以在 UI 中手动测试：

1. 打开应用界面
2. 找到"Runtime"区域的调试面板
3. 使用手势构建器选择方向（如 U）
4. 点击"执行"按钮
5. 查看最后执行结果

---

## 问题：应用启动后自动退出

### 可能原因

#### 1. rdev 监听器崩溃

**症状**：
- 应用启动 30-60 秒后自动退出
- 日志显示 `exit_code: 0`（正常退出）
- 没有错误信息

**原因**：
- `rdev::listen` 在 macOS 上可能因为权限问题而失败
- 监听线程退出后，主进程可能也跟着退出

**解决方案**：
- 确保授予辅助功能权限
- 检查日志是否有 `rdev listen exited with error`

#### 2. 窗口关闭导致应用退出

**症状**：
- 关闭主窗口后应用完全退出
- 托盘图标消失

**原因**：
- Tauri 默认行为：关闭最后一个窗口时退出应用

**解决方案**：
- 使用托盘菜单的"Quit"选项退出
- 或者关闭窗口后应用应该保持在托盘运行（需要配置）

---

## 问题：看不到任何按键日志

### 诊断步骤

#### 1. 检查日志级别

确认日志配置为 `info` 或更详细：

```rust
// src-tauri/src/lib.rs
tracing_subscriber::fmt().with_env_filter("info").init();
```

或者通过环境变量启用 debug 日志：

```bash
RUST_LOG=debug pnpm tauri dev
```

#### 2. 检查监听线程是否启动

查找日志：
```
INFO mino_gesture_lib::platform::mouse_listener: middle-button listener thread started
```

如果看不到这行，说明监听线程根本没启动。

#### 3. 检查 rdev 是否接收事件

查找日志：
```
INFO mino_gesture_lib::platform::mouse_listener: rdev listener is receiving events
```

如果看不到这行，说明：
- **权限未授予**（最可能）
- rdev 监听器启动失败

#### 4. 测试其他按键

移动鼠标或点击左键/右键，应该看到：
```
INFO mino_gesture_lib::platform::mouse_listener: button pressed: Left
```

如果看不到任何按键日志，**100% 确定是权限问题**。

---

## 问题：权限已授予但仍无日志

### 高级诊断

#### 1. 检查是否是开发模式的问题

在开发模式下，权限可能需要授予给：
- `Terminal.app` 或 `iTerm.app`（如果通过终端运行）
- `Cursor` 或 `VSCode`（如果通过 IDE 终端运行）
- `cargo`（Rust 工具链）

#### 2. 尝试打包后的应用

```bash
pnpm tauri build
open src-tauri/target/release/bundle/macos/mino-gesture.app
```

打包后的应用会有自己的权限请求，可能更容易获得权限。

#### 3. 检查系统日志

```bash
# 查看系统安全日志
log show --predicate 'subsystem == "com.apple.TCC"' --last 5m
```

#### 4. 重置权限数据库（谨慎操作）

```bash
# 重置辅助功能权限（需要重启）
tccutil reset Accessibility
```

---

## 问题：中键硬件不工作

### 测试中键是否正常

在其他应用中测试：
- 浏览器：中键点击链接应该在新标签页打开
- 文本编辑器：中键点击应该有反应

如果中键在其他应用也不工作：
- 检查鼠标硬件
- 检查鼠标驱动设置
- 尝试其他鼠标

---

## 临时解决方案：使用右键代替中键

如果中键无法工作，可以临时修改为右键：

```rust
// src-tauri/src/platform/mouse_listener.rs
// 将所有 Button::Middle 改为 Button::Right

EventType::ButtonPress(button) => {
    if matches!(button, Button::Right) {  // 改这里
        // ...
    }
}

EventType::ButtonRelease(button) => {
    if matches!(button, Button::Right) {  // 改这里
        // ...
    }
}
```

**注意**：右键会与系统右键菜单冲突，仅用于测试。

---

## 快速检查清单

- [ ] 已授予"辅助功能"权限
- [ ] 已授予"输入监控"权限
- [ ] 权限授予给了正确的应用（Terminal/Cursor/打包后的 app）
- [ ] 授予权限后已重启应用
- [ ] 日志中看到"listener thread started"
- [ ] 日志中看到"rdev listener is receiving events"
- [ ] 鼠标中键硬件正常工作
- [ ] 移动鼠标时能看到任何事件日志

---

## 获取帮助

如果以上步骤都无法解决问题，请提供：

1. 完整的终端日志输出
2. 系统版本（`sw_vers`）
3. 权限设置截图
4. 是否使用外接鼠标还是触控板
5. 其他应用中中键是否工作

---

## 已知问题

### macOS 15+ (Sequoia) 权限变更

macOS 15 可能对辅助功能权限有更严格的限制。如果遇到问题：

1. 尝试完全重启 Mac
2. 检查是否有新的权限提示
3. 考虑使用打包后的应用而非开发模式

### rdev 0.5.x 已知限制

- 在某些 macOS 版本上，`listen` 可能无法捕获所有鼠标按键
- 中键支持取决于硬件和驱动
- 某些鼠标的"侧键"可能被识别为 `Button::Unknown`

---

## 调试命令速查

```bash
# 查看当前运行的 tauri 进程
ps aux | grep mino-gesture

# 实时查看日志
tail -f /path/to/terminal/output.txt

# 启用详细日志
RUST_LOG=debug pnpm tauri dev

# 检查权限数据库
sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
  "SELECT service, client, allowed FROM access WHERE service='kTCCServiceAccessibility'"
```
