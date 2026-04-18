//! macOS 原生输入事件监听，基于 CGEventTap。
//!
//! 替代 rdev，直接注册系统级事件回调，修复 rdev 不传递中键（OtherMouseDown/Up）的问题。
//! 调用方只需提供一个回调闭包，接收 [`RawEvent`]。

use core_foundation::base::TCFType;
use core_foundation::runloop::{kCFRunLoopCommonModes, CFRunLoop};
use core_foundation_sys::mach_port::CFMachPortRef;
use core_foundation_sys::string::CFStringRef;
use core_graphics::event::{
    CGEvent, CGEventFlags, CGEventTapLocation, CGEventType, EventField,
};
use foreign_types_shared::ForeignType;
use std::os::raw::c_void;
use std::sync::Once;

/// 监听器向上层回调的事件类型，与平台无关。
#[derive(Debug, Clone)]
pub enum RawEvent {
    MousePress { x: f64, y: f64, button: MouseButton },
    MouseRelease { button: MouseButton },
    MouseMove { x: f64, y: f64 },
    KeyPress { keycode: u32 },
    KeyRelease { keycode: u32 },
}

#[derive(Debug, Clone, PartialEq)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
    Other(u8),
}

// CGEventTap 相关 C 类型
type CGEventTapProxy = *mut c_void;
type CGEventTapCallBack = unsafe extern "C" fn(
    proxy: CGEventTapProxy,
    event_type: CGEventType,
    event: core_graphics::sys::CGEventRef,
    user_info: *mut c_void,
) -> core_graphics::sys::CGEventRef;

#[link(name = "ApplicationServices", kind = "framework")]
unsafe extern "C" {
    fn CGEventTapCreate(
        tap: CGEventTapLocation,
        place: u32,
        options: u32,
        events_of_interest: u64,
        callback: CGEventTapCallBack,
        user_info: *mut c_void,
    ) -> CFMachPortRef;

    fn CFMachPortCreateRunLoopSource(
        allocator: *const c_void,
        tap: CFMachPortRef,
        order: isize,
    ) -> *mut c_void;

    fn CFRunLoopAddSource(
        rl: *mut c_void,
        source: *mut c_void,
        mode: CFStringRef,
    );

    fn CGEventTapEnable(tap: CFMachPortRef, enable: bool);
}

// kCGHeadInsertEventTap = 0, ListenOnly = 1
const KCG_HEAD_INSERT_EVENT_TAP: u32 = 0;
const KCG_EVENT_TAP_OPTION_LISTEN_ONLY: u32 = 1;

fn build_event_mask() -> u64 {
    let types = [
        CGEventType::LeftMouseDown,
        CGEventType::LeftMouseUp,
        CGEventType::RightMouseDown,
        CGEventType::RightMouseUp,
        CGEventType::OtherMouseDown,
        CGEventType::OtherMouseUp,
        CGEventType::MouseMoved,
        CGEventType::LeftMouseDragged,
        CGEventType::RightMouseDragged,
        CGEventType::OtherMouseDragged,
        CGEventType::KeyDown,
        CGEventType::KeyUp,
        CGEventType::FlagsChanged,
    ];
    types.iter().fold(0u64, |mask, t| mask | (1u64 << (*t as u64)))
}

/// 按钮编号 → [`MouseButton`]（macOS 约定：0=左,1=右,2=中）
fn button_from_number(n: i64) -> MouseButton {
    match n {
        0 => MouseButton::Left,
        1 => MouseButton::Right,
        2 => MouseButton::Middle,
        _ => MouseButton::Other(n.clamp(0, 255) as u8),
    }
}

// 用于从 CGEventTap 回调中取出用户闭包指针的辅助结构
struct CallbackState {
    cb: Box<dyn Fn(RawEvent) + Send + 'static>,
    last_flags: CGEventFlags,
}

unsafe extern "C" fn tap_callback(
    _proxy: CGEventTapProxy,
    event_type: CGEventType,
    cg_event_ref: core_graphics::sys::CGEventRef,
    user_info: *mut c_void,
) -> core_graphics::sys::CGEventRef {
    let state = unsafe { &mut *(user_info as *mut CallbackState) };

    // SAFETY: CGEvent::from_ptr 要求 cg_event_ref 不为 null，CGEventTap 保证这一点
    let cg_event = unsafe { CGEvent::from_ptr(cg_event_ref as *mut _) };
    let loc = cg_event.location();
    let x = loc.x;
    let y = loc.y;

    let raw = match event_type {
        CGEventType::LeftMouseDown => Some(RawEvent::MousePress {
            x, y,
            button: MouseButton::Left,
        }),
        CGEventType::LeftMouseUp => Some(RawEvent::MouseRelease { button: MouseButton::Left }),
        CGEventType::RightMouseDown => Some(RawEvent::MousePress {
            x, y,
            button: MouseButton::Right,
        }),
        CGEventType::RightMouseUp => Some(RawEvent::MouseRelease { button: MouseButton::Right }),
        CGEventType::OtherMouseDown => {
            let n = cg_event.get_integer_value_field(EventField::MOUSE_EVENT_BUTTON_NUMBER);
            Some(RawEvent::MousePress { x, y, button: button_from_number(n) })
        }
        CGEventType::OtherMouseUp => {
            let n = cg_event.get_integer_value_field(EventField::MOUSE_EVENT_BUTTON_NUMBER);
            Some(RawEvent::MouseRelease { button: button_from_number(n) })
        }
        CGEventType::MouseMoved
        | CGEventType::LeftMouseDragged
        | CGEventType::RightMouseDragged
        | CGEventType::OtherMouseDragged => Some(RawEvent::MouseMove { x, y }),
        CGEventType::KeyDown => {
            let code = cg_event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
            Some(RawEvent::KeyPress { keycode: code as u32 })
        }
        CGEventType::KeyUp => {
            let code = cg_event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
            Some(RawEvent::KeyRelease { keycode: code as u32 })
        }
        CGEventType::FlagsChanged => {
            // FlagsChanged 同时承担修饰键按下/释放，通过 flag 变化方向判断
            let code = cg_event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE);
            let flags = cg_event.get_flags();
            let prev = state.last_flags;
            state.last_flags = flags;

            // 只要 flags 有变化，粗略地用"新增位"判断按下，"消失位"判断释放
            let added = flags.bits() & !prev.bits();
            if added != 0 {
                Some(RawEvent::KeyPress { keycode: code as u32 })
            } else {
                Some(RawEvent::KeyRelease { keycode: code as u32 })
            }
        }
        _ => None,
    };

    // CGEvent::from_ptr 持有所有权会 release，但回调不该 release，需要手动 retain 后再返回
    // 用 std::mem::ManuallyDrop 防止提前 drop
    let ret = cg_event_ref;
    std::mem::forget(cg_event);

    if let Some(event) = raw {
        (state.cb)(event);
    }

    ret
}

/// 在当前线程阻塞运行 CGEventTap 监听循环。
///
/// 通常在独立线程中调用：
/// ```ignore
/// std::thread::spawn(|| listen(|ev| { /* 处理事件 */ }));
/// ```
///
/// # 错误
/// 若 CGEventTapCreate 失败（通常是无辅助功能权限）返回 `Err`。
pub fn listen(cb: impl Fn(RawEvent) + Send + 'static) -> Result<(), &'static str> {
    static WARN_ONCE: Once = Once::new();

    let state = Box::new(CallbackState {
        cb: Box::new(cb),
        last_flags: CGEventFlags::CGEventFlagNull,
    });
    let state_ptr = Box::into_raw(state) as *mut c_void;

    let mask = build_event_mask();

    let tap = unsafe {
        CGEventTapCreate(
            CGEventTapLocation::HID,
            KCG_HEAD_INSERT_EVENT_TAP,
            KCG_EVENT_TAP_OPTION_LISTEN_ONLY,
            mask,
            tap_callback,
            state_ptr,
        )
    };

    if tap.is_null() {
        // 避免内存泄漏：回收 state
        unsafe { drop(Box::from_raw(state_ptr as *mut CallbackState)) };
        WARN_ONCE.call_once(|| {
            tracing::error!(
                "CGEventTapCreate failed — grant Accessibility permission in System Settings"
            );
        });
        return Err("CGEventTapCreate returned null");
    }

    unsafe {
        CGEventTapEnable(tap, true);
        let source = CFMachPortCreateRunLoopSource(std::ptr::null(), tap, 0);
        let rl = CFRunLoop::get_current();
        CFRunLoopAddSource(
            rl.as_concrete_TypeRef() as *mut c_void,  // TCFType trait in scope via use
            source,
            kCFRunLoopCommonModes,
        );
        CFRunLoop::run_current();
    }

    Ok(())
}
