use crate::config::ConfigStore;
use crate::core::execution_result::ExecutionResult;
use crate::domain::actions::ActionExecutor;
use crate::domain::gesture::GestureRecognizer;
use crate::domain::rules::RuleEngine;
use crate::platform::input::InputEngine;

#[derive(Debug)]
pub(crate) struct AppState {
    pub(crate) config: ConfigStore,
    pub(crate) input: InputEngine,
    pub(crate) recognizer: GestureRecognizer,
    pub(crate) rules: RuleEngine,
    pub(crate) actions: ActionExecutor,
    pub(crate) last_execution: Option<ExecutionResult>,
}
