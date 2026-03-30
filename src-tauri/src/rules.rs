use crate::gesture::Direction;

#[derive(Debug, Clone)]
pub struct RuleEngine;

impl RuleEngine {
    pub fn new() -> Self {
        Self
    }

    pub fn matches_mission_control(&self, tokens: &[Direction]) -> bool {
        tokens == [Direction::U]
    }
}
