use crate::gesture::Point;

#[derive(Debug, Default, Clone)]
pub struct InputEngine {
    active: bool,
    points: Vec<Point>,
}

impl InputEngine {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn start(&mut self, start: Point) {
        self.active = true;
        self.points.clear();
        self.points.push(start);
    }

    pub fn sample(&mut self, point: Point) {
        if self.active {
            self.points.push(point);
        }
    }

    pub fn end(&mut self) -> Vec<Point> {
        self.active = false;
        std::mem::take(&mut self.points)
    }

    pub fn is_active(&self) -> bool {
        self.active
    }
}
