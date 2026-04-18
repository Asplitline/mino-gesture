use crate::config::RuleConfig;
use crate::domain::gesture::Direction;

#[derive(Debug, Clone)]
pub struct RuleEngine;

impl RuleEngine {
    pub fn new() -> Self {
        Self
    }

    pub fn matches_mission_control(&self, tokens: &[Direction]) -> bool {
        tokens == [Direction::U]
    }

    pub fn match_rule<'a>(
        &self,
        rules: &'a [RuleConfig],
        scope: &str,
        button: &str,
        gesture: &str,
    ) -> Option<&'a RuleConfig> {
        let normalized_scope = scope.trim();
        let normalized_button = button.trim();
        let normalized_gesture = gesture.trim().to_uppercase();

        rules
            .iter()
            .find(|r| {
                r.enabled
                    && r.scope == normalized_scope
                    && r.button == normalized_button
                    && r.gesture == normalized_gesture
            })
            .or_else(|| {
                rules.iter().find(|r| {
                    r.enabled
                        && r.scope == "global"
                        && r.button == normalized_button
                        && r.gesture == normalized_gesture
                })
            })
    }
}
