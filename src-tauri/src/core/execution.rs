//! 手势归一化、校验，以及与规则匹配后的执行逻辑（供全局监听与 `invoke` 共用）。

use crate::core::execution_result::ExecutionResult;
use crate::core::state::AppState;

pub(crate) fn normalize_scope(scope: &str) -> String {
    let s = scope.trim();
    if s.is_empty() {
        "global".to_string()
    } else {
        s.to_string()
    }
}

pub(crate) fn normalize_gesture(gesture: &str) -> String {
    gesture.trim().to_uppercase()
}

pub(crate) fn validate_gesture(gesture: &str) -> Result<(), String> {
    if gesture.is_empty() {
        return Err("gesture is required".to_string());
    }
    if !gesture.chars().all(|c| matches!(c, 'U' | 'D' | 'L' | 'R')) {
        return Err("gesture must only contain U, D, L, R".to_string());
    }
    Ok(())
}

/// 根据已规范化的手势串与作用域匹配规则并执行动作（不写 `last_execution`）。
pub(crate) fn apply_gesture_match(
    guard: &mut AppState,
    gesture: &str,
    scope: &str,
) -> ExecutionResult {
    let gesture = normalize_gesture(gesture);
    let scope = normalize_scope(scope);

    if let Some(rule) = guard
        .rules
        .match_rule(guard.config.rules(), &scope, &gesture)
        .cloned()
    {
        match guard.actions.execute_action_type(&rule.action_type) {
            Ok(_) => ExecutionResult {
                matched: true,
                scope,
                gesture,
                rule_name: Some(rule.name),
                action_type: Some(rule.action_type),
                success: true,
                message: "action executed".to_string(),
                trigger: None,
            },
            Err(e) => ExecutionResult {
                matched: true,
                scope,
                gesture,
                rule_name: Some(rule.name),
                action_type: Some(rule.action_type),
                success: false,
                message: e.to_string(),
                trigger: None,
            },
        }
    } else {
        ExecutionResult {
            matched: false,
            scope,
            gesture,
            rule_name: None,
            action_type: None,
            success: false,
            message: "no matching rule".to_string(),
            trigger: None,
        }
    }
}
