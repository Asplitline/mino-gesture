# 中键诊断指南

## 问题确认

从日志看,rdev 完全没有捕获到中键事件。只有左键和右键有日志:
```
✓ 左键 - 正常
✓ 右键 - 正常  
✗ 中键 - 无任何日志
```

这说明问题在**硬件层或系统层**,不是代码问题。

## 诊断步骤

### 1. 运行独立测试程序

```bash
cd /Users/shouyong/myqz/code/mino-gesture/src-tauri
cargo run --bin test_middle_button
```

然后按下:
- 左键 → 应该显示 "✓ 左键按下"
- 中键 → **应该显示 "✓ 中键按下 ← 这个是关键!"**
- 右键 → 应该显示 "✓ 右键按下"

如果中键仍然没有输出,说明问题确定在 rdev/硬件/系统层。

### 2. 检查鼠标硬件

**请回答以下问题:**

1. 你用的是什么鼠标?
   - [ ] 触控板 (没有中键)
   - [ ] Magic Mouse (没有中键)
   - [ ] 普通三键鼠标
   - [ ] 游戏鼠标
   - [ ] 其他: ___________

2. 鼠标有物理滚轮吗?
   - [ ] 有,而且可以按下
   - [ ] 有,但按不下去
   - [ ] 没有滚轮

3. 在其他应用中测试中键:

**测试 A: 在浏览器**
```bash
open https://www.toptal.com/developers/keycode
```
按下滚轮,应该显示:
- event.button: 1
- event.code: "Button1" 
- 显示 "Middle Mouse Button"

**测试 B: 在文本编辑器**
```bash
open -a TextEdit
```
选中一段文字,按中键 → 在 Linux 上会粘贴(macOS 可能无反应,这是正常的)

### 3. 检查 macOS 系统设置

**A. 鼠标设置**
```bash
open "x-apple.systempreferences:com.apple.Mouse-Settings.extension"
```
查看是否有"第三按钮"或"中键"选项被重新映射。

**B. 辅助功能权限**
```bash
# 系统设置 > 隐私与安全性 > 辅助功能
# 确认 Terminal.app 或 Cursor 已启用
```

**C. 输入监控权限**
```bash
# 系统设置 > 隐私与安全性 > 输入监控  
# 确认 Terminal.app 或 Cursor 已启用
```

### 4. 检查鼠标驱动

某些鼠标(特别是罗技、雷蛇等)有专用驱动,可能会:
- 拦截中键事件
- 将中键映射到其他功能
- 需要在驱动软件中启用"原始模式"

常见驱动软件:
- Logi Options+ (罗技)
- Razer Synapse (雷蛇)
- Logitech Control Center
- SteerMouse
- USB Overdrive

**解决方法:**
1. 打开鼠标驱动软件
2. 找到中键设置
3. 设置为"默认"或"未分配"
4. 关闭"手势"或"特殊功能"

### 5. 尝试不同的鼠标

如果可能,换一个鼠标测试:
- 借用同事的鼠标
- 使用不同品牌/型号
- 尝试有线 vs 无线

## 可能的原因

### A. 硬件不支持 ❌
**症状:** 触控板、Magic Mouse
**解决:** 换个有物理中键的鼠标

### B. macOS 拦截了中键 ⚠️
**症状:** 
- 按中键会触发 Mission Control
- 按中键会触发其他系统功能
- keycode.info 能检测到,但应用收不到

**解决:**
1. 系统设置 → 鼠标
2. 找到中键设置
3. 改为"不执行操作"

### C. 鼠标驱动拦截 ⚠️
**症状:**
- 鼠标有专用驱动软件
- keycode.info 能检测到
- 卸载驱动后中键恢复

**解决:**
1. 打开驱动软件
2. 将中键设置为"默认"
3. 或者完全卸载驱动

### D. rdev 库 bug 🐛
**症状:**
- 换其他鼠标也不行
- keycode.info 能检测到
- 独立测试程序也收不到

**解决:**
这是 rdev 库的问题,需要上报:
https://github.com/Narsil/rdev/issues

### E. macOS 版本问题 ⚠️
**症状:** macOS 15+ (Sequoia)

某些新版本 macOS 可能有额外的权限限制。

**解决:**
```bash
# 重置权限数据库
tccutil reset Accessibility
tccutil reset ListenEvent

# 然后重新授权
```

## 临时解决方案

如果中键实在不能用,可以**临时用右键代替**:

```rust
// src-tauri/src/platform/mouse_listener.rs
// 第 212 行,改为:
if matches!(button, Button::Right) {  // 用右键代替中键

// 第 234 行,同样改为:
let should_process = if matches!(button, Button::Right) {
```

这样右键就能触发手势了(会牺牲右键菜单功能)。

## 报告问题

如果所有方法都试过了还是不行,请提供:

1. **硬件信息:**
   - 鼠标型号: ___________
   - 有无驱动软件: ___________
   - 连接方式(USB/蓝牙/无线): ___________

2. **测试结果:**
   - [ ] keycode.info 能检测到中键
   - [ ] 独立测试程序能检测到
   - [ ] 其他应用(如浏览器)能检测到

3. **系统信息:**
   ```bash
   sw_vers
   system_profiler SPUSBDataType | grep -A 10 Mouse
   ```

4. **权限状态:**
   ```bash
   sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
     "SELECT service, client, allowed FROM access WHERE service IN ('kTCCServiceAccessibility', 'kTCCServiceListenEvent')"
   ```

## 已知兼容鼠标

以下鼠标在 macOS 上中键正常工作:
- 罗技 MX Master 系列
- 罗技 G502
- 普通三键 USB 鼠标
- 微软 Sculpt Ergonomic Mouse

不支持中键的设备:
- MacBook 触控板
- Magic Mouse (一代/二代)
- Magic Trackpad
