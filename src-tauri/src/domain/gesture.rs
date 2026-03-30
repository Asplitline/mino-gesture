#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Direction {
    U,
    D,
    L,
    R,
}

#[derive(Debug, Clone, Copy)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone)]
pub struct GestureRecognizer {
    threshold: f64,
}

pub fn directions_to_string(dirs: &[Direction]) -> String {
    dirs
        .iter()
        .map(|d| match d {
            Direction::U => 'U',
            Direction::D => 'D',
            Direction::L => 'L',
            Direction::R => 'R',
        })
        .collect()
}

impl GestureRecognizer {
    pub fn new(threshold: f64) -> Self {
        Self { threshold }
    }

    pub fn threshold(&self) -> f64 {
        self.threshold
    }

    pub fn recognize(&self, points: &[Point]) -> Vec<Direction> {
        if points.len() < 2 {
            return Vec::new();
        }

        let mut tokens = Vec::new();
        let mut last_dir: Option<Direction> = None;

        for win in points.windows(2) {
            let dx = win[1].x - win[0].x;
            let dy = win[1].y - win[0].y;
            let dist = (dx * dx + dy * dy).sqrt();
            if dist < self.threshold {
                continue;
            }

            let dir = if dx.abs() > dy.abs() {
                if dx > 0.0 { Direction::R } else { Direction::L }
            } else if dy > 0.0 {
                Direction::D
            } else {
                Direction::U
            };

            if last_dir != Some(dir) {
                tokens.push(dir);
                last_dir = Some(dir);
            }
        }
        tokens
    }
}
