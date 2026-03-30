//! 一次手势匹配/执行的对外可序列化结果（事件与 `invoke` 共用）。

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ExecutionResult {
    pub(crate) matched: bool,
    pub(crate) scope: String,
    pub(crate) gesture: String,
    pub(crate) rule_name: Option<String>,
    pub(crate) action_type: Option<String>,
    pub(crate) success: bool,
    pub(crate) message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) trigger: Option<String>,
}
