//! 应用核心：运行时状态、手势匹配执行链、可序列化执行结果。
//! 依赖 `config`（持久化模型）、`domain`（业务引擎）、`platform::input`（采样抽象）。

pub mod execution;
pub mod execution_result;
pub mod state;
